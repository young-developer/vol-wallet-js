// Copyright (c) 2019 Cryptogogue, Inc. All Rights Reserved.

import { Schema }                   from 'cardmotron';
import { assert, ProgressController, RevocableContext, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, reaction, runInAction } from 'mobx';
import Dexie                        from 'dexie';
import _                            from 'lodash';

import InventoryWorker              from './InventoryWorker.worker';

//const debugLog = function () {}
const debugLog = function ( ...args ) { console.log ( '@INVENTORY:', ...args ); }

//================================================================//
// InventoryService
//================================================================//
export class InventoryService {

    @observable assets          = {};
    @observable inbox           = [];
    @observable version         = false;
    @observable isLoaded        = false;
    @observable schema          = false;

    @computed get accountID     () { return this.accountService.accountID; }
    @computed get accountIndex  () { return this.accountService.index; }
    @computed get networkID     () { return this.accountService.networkService.networkID; }
    @computed get nonce         () { return this.version.nonce; }

    //----------------------------------------------------------------//
    async applyDeltaAsync () {

        if ( !this.delta ) return false;

        debugLog ( 'APPLY DELTA' );

        const delta = this.delta;

        // const assetsFiltered = _.clone ( this.accountService.account.assetsFiltered || {});

        for ( let assetID of delta.deletions ) {
            
            delete assetsFiltered [ assetID ];
            if ( delta.additions.includes ( assetID )) continue; // skip if removed then re-added
            debugLog ( 'DELETING ASSET', assetID );
            await this.db.assets.where ({ networkID: this.networkID, accountIndex: this.accountIndex, assetID: assetID }).delete ();

            runInAction (() => {
                delete this.assets [ assetID ];
                this.inventory.deleteAsset ( assetID );
            });
        }

        const assets = delta.assets;

        for ( let asset of assets ) {

            const prevAsset = this.assets [ asset.assetID ];
            if ( prevAsset && ( prevAsset.inventoryNonce === asset.inventoryNonce )) continue;

            // delete assetsFiltered [ asset.assetID ]; // just in case
            debugLog ( 'ADDING ASSET', asset.assetID );

            asset = await this.expandAssetAsync ( asset );

            console.log ( 'EXPANDED ASSET:', asset );

            await this.db.assets.put ({ networkID: this.networkID, accountIndex: this.accountIndex, assetID: asset.assetID, asset: _.cloneDeep ( asset )});
            await this.db.inbox.put ({ networkID: this.networkID, accountIndex: this.accountIndex, assetID: asset.assetID });

            runInAction (() => {
                this.inbox.push ( asset.assetID );
                this.assets [ asset.assetID ] = asset;
                this.inventory.setAsset ( asset );
            });
        }

        runInAction (() => {
            // this.accountService.account.assetsFiltered = assetsFiltered;
            this.version.nonce          = delta.nextNonce;
            this.version.timestamp      = delta.timestamp;
        });

        await this.db.accounts.put ( _.cloneDeep ( this.version ));
        await this.db.inventoryDelta.where ({ networkID: this.networkID, accountIndex: this.accountIndex }).delete ();

        this.delta = false;

        return true;
    }

    //----------------------------------------------------------------//
    @action
    async clearInbox () {
        this.inbox = [];
        await this.db.inbox.where ({ networkID: this.networkID, accountIndex: this.accountIndex }).delete ();
    }

    //----------------------------------------------------------------//
    constructor ( accountService, inventoryController, progressController ) {

        this.revocable = new RevocableContext ();

        this.progress           = progressController || new ProgressController ();
        this.appState           = accountService.appState;
        this.accountService     = accountService;
        this.networkService     = accountService.networkService;
        this.inventory          = inventoryController;

        this.appDB              = this.appState.appDB;
        this.db                 = this.appDB.db;

        runInAction (() => {
            this.version = {
                networkID:      this.networkID,
                accountIndex:   this.accountIndex,
                nonce:          0,
                timestamp:      false,
            }
        });

        this.worker = new InventoryWorker ();
    }

    //----------------------------------------------------------------//
    async expandAssetAsync ( asset ) {

        return new Promise (( resolve, reject ) => {
            
            this.worker.addEventListener ( 'message', async ( event ) => {
                console.log ( 'WORKER finished expandAssetAsync' );
                resolve ( event.data.asset );
            });
            this.worker.postMessage ({ asset: asset });
        });
    }

    //----------------------------------------------------------------//
    async expandAssetsAsync ( assets ) {

        return new Promise (( resolve, reject ) => {
            
            this.worker.addEventListener ( 'message', async ( event ) => {
                console.log ( 'WORKER finished expandAssetsAsync' );
                resolve ( event.data );
            });
            this.worker.postMessage ({ assets: assets });
        });
    }

    //----------------------------------------------------------------//
    finalize () {

        this.revocable.finalize ();
        this.worker.terminate ();
    }

    //----------------------------------------------------------------//
    formatSchemaKey ( schemaHash, version ) {

        return `${ version.release } - ${ version.major }.${ version.minor }.${ version.revision } (${ schemaHash })`;
    }

    //----------------------------------------------------------------//
    @computed
    get inboxSize () {

        return this.inbox.length;
    }

    //----------------------------------------------------------------//
    isNew ( assetID ) {

        return this.inbox.includes ( assetID );
    }

    //----------------------------------------------------------------//
    async loadAssetsAsync () {

        debugLog ( 'LOADING ASSETS' );

        let assets  = {};
        let inbox   = [];
        
        const assetRows = await this.db.assets.where ({ networkID: this.networkID, accountIndex: this.accountIndex }).toArray ();
        
        for ( let row of assetRows ) {
            assets [ row.assetID ] = row.asset;
        }

        const inboxRows = await this.db.inbox.where ({ networkID: this.networkID, accountIndex: this.accountIndex }).toArray ();

        for ( let row of inboxRows ) {
            inbox.push ( row.assetID );
        }

        debugLog ( 'loaded assets', assets );
        debugLog ( 'loaded inbox', inbox );

        runInAction (() => {
            this.assets = assets;
            this.inbox = inbox;
        });

        this.inventory.setAssets ( assets );

        const deltaRow = await this.db.inventoryDelta.get ({ networkID: this.networkID, accountIndex: this.accountIndex });
        if ( deltaRow && deltaRow.delta ) {
            this.delta = deltaRow.delta;
        }
    }

    //----------------------------------------------------------------//
    async loadAsync () {

        if ( this.isLoaded ) return;

        this.progress.setLoading ( true );

        await this.progress.onProgress ( 'Loading Inventory' );

        const version = await this.db.accounts.get ({ networkID: this.networkID, accountIndex: this.accountIndex });
        if ( version ) {

            debugLog ( 'LOADING SCHEMA AND INVENTORY FROM DB' );

            const schemaRecord = await this.db.schemas.get ({ networkID: this.networkID });
            if ( schemaRecord ) {

                debugLog ( 'HAS SCHEMA RECORD' );

                await this.makeSchema ( schemaRecord.schema );
                if ( this.schema ) {

                    debugLog ( 'HAS CACHED SCHEMA' );

                    await this.loadAssetsAsync ();
                    if ( Object.keys ( this.assets ).length > 0 ) {
                        debugLog ( 'LOADED CACHED ASSETS' );
                    }
                }
            }

            runInAction (() => { this.version = version; });
        }

        runInAction (() => { this.isLoaded = true; });
        this.progress.setLoading ( false );
    }

    //----------------------------------------------------------------//
    async makeSchema ( schemaObj ) {

        const schema = new Schema ( schemaObj );
        // await schema.fetchFontsAsync ( schemaObj.fonts || {});
        runInAction (() => {
            this.schema = schema;
        });
        this.inventory.setSchema ( schema );

        return new Promise (( resolve, reject ) => {
            
            this.worker.addEventListener ( 'message', ( event ) => {
                console.log ( 'WORKER finished makeSchema', event );
                resolve ();
            });
            this.worker.postMessage ({ schemaObj: schemaObj });
        });
    }

    //----------------------------------------------------------------//
    @computed
    get newAssets () {

        const newAssets = {};

        for ( let assetID of this.inbox ) {
            newAssets [ assetID ] = this.assets [ assetID ];
        }
        return newAssets;
    }

    //----------------------------------------------------------------//
    @action
    async reset () {

        debugLog ( 'RESET' );

        this.version.nonce          = 0;
        this.version.timestamp      = false;

        if ( Object.keys ( this.assets ).length > 0 ) {
            this.assets = {};
            this.inbox = [];
            this.inventory.setAssets ({});
            await this.db.assets.where ({ networkID: this.networkID, accountIndex: this.accountIndex }).delete (); // deleted the assets *and* the inbox
            await this.db.inbox.where ({ networkID: this.networkID, accountIndex: this.accountIndex }).delete (); // deleted the assets *and* the inbox
        }

        debugLog ( 'PUTTING VERSION:', JSON.stringify ( this.version, null, 4 ));

        await this.db.accounts.put ( _.cloneDeep ( this.version ));
    }

    //----------------------------------------------------------------//
    async serviceStep () {

        if ( !this.isLoaded ) return;
        if ( this.delta ) return;

        try {
            await this.updateAsync ();
        }
        catch ( error ) {
            debugLog ( error );
        }
    }

    //----------------------------------------------------------------//
    async updateAsync () {

        debugLog ( 'UPDATE INVENTORY' );

        const data = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( `/accounts/${ this.accountID }/inventory` ));

        debugLog ( 'STATUS FROM SERVER:', data );

        if ( data.inventoryTimestamp ) {

            await this.updateSchema ( data.schemaHash, data.schemaVersion );
            if ( this.schema ) {
                await this.updateDeltaAsync ( data.inventoryNonce, data.inventoryTimestamp );
            }
        }
        else {
            await this.reset ();
        }

    }

    //----------------------------------------------------------------//
    async updateDeltaAsync ( nextNonce, timestamp ) {

        debugLog ( 'UPDATE INVENTORY (DELTA)' );

        let currentNonce = this.version.nonce;

        debugLog ( 'CURRENT NONCE:', currentNonce );
        debugLog ( 'NEXT NONCE:', nextNonce );
        debugLog ( 'TIMESTAMP:', timestamp );

        if ( nextNonce === currentNonce ) return;
        if (( timestamp !== this.version.timestamp ) || ( nextNonce < currentNonce )) {
            debugLog ( 'TIMESTAMP MISMATCH OR NONCE ROLLBACK; RESETTING' );
            await this.reset ();
            currentNonce = 0;
        }

        const count         = nextNonce - currentNonce;
        const serviceURL    = this.networkService.getServiceURL ( `/accounts/${ this.accountID }/inventory/log/${ currentNonce }`, { count: count });
        const data          = await this.revocable.fetchJSON ( serviceURL );

        if ( data.nextNonce <= currentNonce ) return;

        data.timestamp = timestamp; // store it here for later

        await this.db.inventoryDelta.put ({ networkID: this.networkID, accountIndex: this.accountIndex, delta: data });
        this.delta = data;
    }

    //----------------------------------------------------------------//
    async updateSchema ( schemaHash, schemaVersion ) {

        const schema        = false;

        if ( !( schemaHash && schemaVersion )) return;
        let schemaKey = this.formatSchemaKey ( schemaHash, schemaVersion );

        if ( this.schema ) {
            const networkRecord = await this.db.networks.get ( this.networkID );
            if ( networkRecord && ( networkRecord.schemaKey === schemaKey )) return;
        }

        await this.db.schemas.where ({ networkID: this.networkID }).delete ();

        const schemaInfo = await this.revocable.fetchJSON ( this.networkService.getServiceURL ( '/schema' ));

        schemaKey = this.formatSchemaKey ( schemaInfo.schemaHash, schemaInfo.schema.version );
        await this.db.schemas.put ({ networkID: this.networkID, key: schemaKey, schema: schemaInfo.schema });
        await this.db.networks.put ({ networkID: this.networkID, schemaKey: schemaKey });

        await this.makeSchema ( schemaInfo.schema );
    }
}
