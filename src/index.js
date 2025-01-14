// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import pkg from '../package.json'

import './index.css';
import 'semantic-ui-css/semantic.min.css';

import * as cardmotron from 'cardmotron';
import * as fgc from 'fgc';

import { configure } from 'mobx';
configure ({
    enforceActions:     'always',
});

import { AccountListScreen }            from './AccountListScreen';
import { AccountScreen }                from './AccountScreen';
import { AccountDebugScreen }           from './AccountDebugScreen';
import { ConsensusScreen }              from './ConsensusScreen';
import { DashboardScreen }              from './DashboardScreen';
import { DebugHTTPScreen }              from './debug/DebugHTTPScreen';
import { DebugNetMonScreen }            from './debug/DebugNetMonScreen';
import { DebugNetStatScreen }           from './debug/DebugNetStatScreen';
import { DiagnosticAndRecoveryScreen }  from './DiagnosticAndRecoveryScreen';
import { InventoryScreen }              from './InventoryScreen';
import { KeysScreen }                   from './KeysScreen';
import { KeyUtilScreen }                from './KeyUtilScreen';
import { MinerControlScreen }           from './MinerControlScreen';
import { MinerInfoUtilScreen }          from './MinerInfoUtilScreen';
import { SchemaUtilScreen }             from './SchemaUtilScreen';
import { ServicesScreen }               from './ServicesScreen';
import { ShopScreen }                   from './ShopScreen';
import { StampsScreen }                 from './StampsScreen';
import { AssetJPEGView }                 from './AssetJPEGView';
import { TermsOfServiceScreen }         from './TermsOfServiceScreen';
import { TransactionUtilScreen }        from './TransactionUtilScreen';
import registerServiceWorker            from './util/registerServiceWorker';
import { WalletResetScreen }            from 'WalletResetScreen';
import React                            from 'react';
import { useClearCache }                from "react-clear-cache";
import ReactDOM                         from 'react-dom';
import { BrowserRouter, Route, Link, Switch, useLocation } from "react-router-dom";

//----------------------------------------------------------------//
const App = () => {

    const { isLatestVersion, emptyCacheStorage } = useClearCache ();
    const location = useLocation ();

    if ( !isLatestVersion ) {
        console.log ( 'NEW VERSION DETECTED; EMPTYING CACHE' );
        emptyCacheStorage ();
    }

    return (
        <div>
            <Switch key = { location.pathname }>
            
                <Route exact path = "/net/:networkID/account/:accountID"                component = { AccountScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/debug"          component = { AccountDebugScreen }/>
                <Route exact path = "/net/:networkID/consensus"                         component = { ConsensusScreen }/>
                <Route exact path = "/net/:networkID/services"                          component = { ServicesScreen }/>
                <Route exact path = "/net/:networkID/terms"                             component = { TermsOfServiceScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/inventory"      component = { InventoryScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/keys"           component = { KeysScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/miner"          component = { MinerControlScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/shop"           component = { ShopScreen }/>
                <Route exact path = "/net/:networkID/account/:accountID/stamps"         component = { StampsScreen }/>
                <Route exact path = "/net/:networkID"                                   component = { AccountListScreen }/>

                <Route exact path = "/util/diagnostic"          component = { DiagnosticAndRecoveryScreen }/>
                <Route exact path = "/util/hash"                component = { cardmotron.HashUtilScreen }/>
                <Route exact path = "/util/key"                 component = { KeyUtilScreen }/>
                <Route exact path = "/util/miner"               component = { MinerInfoUtilScreen }/>
                <Route exact path = "/util/reset"               component = { WalletResetScreen }/>
                <Route exact path = "/util/schema"              component = { SchemaUtilScreen }/>
                <Route exact path = "/util/transaction"         component = { TransactionUtilScreen }/>

                <Route exact path = "/debug/aes"                component = { fgc.debug.AESScreen }/>
                <Route exact path = "/debug/barcode/pdf417"     component = { fgc.debug.BarcodePDF417Screen }/>
                <Route exact path = "/debug/barcode/qr"         component = { fgc.debug.BarcodeQRScreen }/>
                <Route exact path = "/debug/cardmotron"         component = { cardmotron.EditorScreen }/>
                <Route exact path = "/debug/cryptokey"          component = { fgc.debug.CryptoKeyScreen }/>
                <Route exact path = "/debug/dropzone"           component = { fgc.debug.DropzoneScreen }/>
                <Route exact path = "/debug/fetch"              component = { DebugHTTPScreen }/>
                <Route exact path = "/debug/filepicker"         component = { fgc.debug.FilePickerScreen }/>
                <Route exact path = "/debug/handlebars"         component = { fgc.debug.HandlebarsScreen }/>
                <Route exact path = "/debug/infinitescroll"     component = { fgc.debug.InfiniteScrollScreen }/>
                <Route exact path = "/debug/mobx"               component = { fgc.debug.MobXScreen }/>
                <Route exact path = "/debug/netmon"             component = { DebugNetMonScreen }/>
                <Route exact path = "/debug/netstat"            component = { DebugNetStatScreen }/>
                <Route exact path = "/debug/print"              component = { fgc.debug.PrintScreen }/>
                <Route exact path = "/debug/squap"              component = { cardmotron.debug.SquapScreen }/>
                <Route exact path = "/debug/svgtopng"           component = { cardmotron.debug.SVGtoPNGScreen }/>
                <Route exact path = "/debug/textfitter"         component = { fgc.debug.TextFitterScreen }/>
                <Route exact path = "/debug/textstyle"          component = { fgc.debug.TextStyleScreen }/>
                <Route exact path = "/debug/jpeg/:nodeUrl/:assetID"          component = { AssetJPEGView }/>

                <Route exact path = "/"                         component = { DashboardScreen }/>
            </Switch>
            <div style = {{
                width: '100%',
                textAlign: 'center',
            }}>
                { `${ pkg.name } ${ pkg.version }` }
            </div>
        </div>
    );
}

//----------------------------------------------------------------//
ReactDOM.render (
    <BrowserRouter>
        <App/>
    </BrowserRouter>,
    document.getElementById ( 'root' )
);

registerServiceWorker ();
