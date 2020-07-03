// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import './InventoryScreen.css';

import { AccountNavigationBar, ACCOUNT_TABS }               from './AccountNavigationBar';
import { AppStateService }                                  from './AppStateService';
import { CraftingFormController }                           from './CraftingFormController';
import { InventoryFilterDropdown }                          from './InventoryFilterDropdown';
import { InventoryMenu }                                    from './InventoryMenu';
import { InventoryTagsDropdown }                            from './InventoryTagsDropdown';
import KeyboardEventHandler                                 from 'react-keyboard-event-handler';
import { TransactionFormController_SendAssets }             from './TransactionFormController_SendAssets';
import { TransactionModal }                                 from './TransactionModal';
import { UpgradesFormController }                           from './UpgradesFormController';
import { AssetModal, AssetTagsModal, inventoryMenuItems, InventoryPrintController, InventoryViewController, InventoryPrintView, InventoryView } from 'cardmotron';
import { assert, hooks, ProgressSpinner, SingleColumnContainerView, util } from 'fgc';
import _                                                    from 'lodash';
import { action, computed, extendObservable, observable }   from "mobx";
import { observer }                                         from 'mobx-react';
import React, { useState }                                  from 'react';
import { Redirect }                                         from 'react-router';
import { Link }                                             from 'react-router-dom';
import { Dropdown, Grid, Icon, List, Menu, Loader }         from 'semantic-ui-react';

//================================================================//
// InventoryScreenBody
//================================================================//
export const InventoryScreen = observer (( props ) => {

    const [ batchSelect, setBatchSelect ]           = useState ( false );
    const [ zoomedAssetID, setZoomedAssetID ]       = useState ( false );
    const [ assetsUtilized, setAssetsUtilized ]     = useState ( false );

    const networkIDFromEndpoint     = util.getMatch ( props, 'networkID' );
    const accountIDFromEndpoint     = util.getMatch ( props, 'accountID' );

    const appState                  = hooks.useFinalizable (() => new AppStateService ( networkIDFromEndpoint, accountIDFromEndpoint ));

    const progress                  = appState.inventoryProgress;
    const inventory                 = appState.inventory;
    const inventoryService          = appState.inventoryService;
    const tags                      = appState.inventoryTags;

    const controller                = hooks.useFinalizable (() => new InventoryViewController ( inventory ));
    const printController           = hooks.useFinalizable (() => new InventoryPrintController ( controller ));
    const craftingFormController    = hooks.useFinalizable (() => new CraftingFormController ( appState, inventory ));
    const upgradesFormController    = hooks.useFinalizable (() => new UpgradesFormController ( appState, inventory ));

    controller.setFilterFunc (( assetID ) => {
        return tags.isAssetVisible ( assetID ) && !( appState.assetsUtilized.includes ( assetID ) || inventoryService.isNew ( assetID ));
    });

    upgradesFormController.setFilterFunc (( assetID ) => {
        return controller.filterFunc ( assetID ) && ( controller.hasSelection ? controller.isSelected ( assetID ) : true );
    });

    const onAssetSelect = ( asset, toggle ) => {
        controller.toggleAssetSelection ( asset );
    }

    const onAssetMagnify = ( asset ) => {
        setZoomedAssetID ( asset.assetID );
    }

    // const onAssetEllipsis = ( asset ) => {
    //     console.log ( 'ELLIPSIS!' );
    // }

    const onDeselect = () => {
        if ( !batchSelect ) {
            controller.clearSelection ();
        }
    }

    const hasAssets = ( inventoryService.isLoaded && ( inventory.availableAssetsArray.length > 0 ));

    return (
        <div style = {{
            display: 'flex',
            flexFlow: 'column',
            height: '100vh',
        }}>
            <div className = 'no-print'>
                <SingleColumnContainerView>
                    <AccountNavigationBar
                        appState    = { appState }
                        tab         = { ACCOUNT_TABS.INVENTORY }
                    />
                    <InventoryMenu
                        appState                = { appState }
                        controller              = { controller }
                        printController         = { printController }
                        craftingFormController  = { craftingFormController }
                        upgradesFormController  = { upgradesFormController }
                        tags                    = { tags }
                    />
                </SingleColumnContainerView>
            </div>

            <ProgressSpinner loading = {( inventoryService.isLoaded === false ) && progress.loading } message = { inventoryService.isLoaded ? '' : progress.message }>

                <If condition = { hasAssets }>
                    <Choose>
                        <When condition = { controller.isPrintLayout }>
                            <InventoryPrintView
                                key = { printController.pages.length }
                                pages = { printController.pages }
                            />
                        </When>
                        <Otherwise>
                            <KeyboardEventHandler
                                handleKeys      = {[ 'shift', 'alt' ]}
                                handleEventType = 'keydown'
                                onKeyEvent      = {( key, e ) => {
                                    console.log ( 'DOWN' );
                                    setBatchSelect ( true );
                                }}
                            />
                            <KeyboardEventHandler
                                handleKeys      = {[ 'shift', 'alt' ]}
                                handleEventType = 'keyup'
                                onKeyEvent      = {( key, e ) => {
                                    console.log ( 'UP' );
                                    setBatchSelect ( false );
                                }}
                            />
                            <div style = {{ flex: 1 }}>
                                <InventoryView
                                    key         = { `${ controller.sortMode } ${ controller.zoom }` }
                                    controller  = { controller }
                                    onSelect    = { onAssetSelect }
                                    onMagnify   = { batchSelect ? undefined : onAssetMagnify }
                                    onDeselect  = { onDeselect }
                                />
                            </div>
                            <AssetModal
                                controller      = { controller }
                                assetID         = { zoomedAssetID }
                                onClose         = {() => { setZoomedAssetID ( false )}}
                            />
                        </Otherwise>
                    </Choose>
                </If>

            </ProgressSpinner>
        </div>
    );
});
