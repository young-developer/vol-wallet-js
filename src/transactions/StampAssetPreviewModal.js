// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { AssetCardView, InventoryWithFilter, inventoryMenuItems, InventoryViewController, InventoryView } from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// StampAssetPreviewModalBody
//================================================================//
const StampAssetPreviewModalBody = observer (( props ) => {

    const { open, onClose }         = props;
    const inventoryViewController   = hooks.useFinalizable (() => new InventoryViewController ( props.controller.previewInventory, false ));

    return (
        <UI.Modal
            closeIcon
            onClose = { onClose }
            open = { open }
        >
            <UI.Modal.Header>{ `Preview` }</UI.Modal.Header>
            
            <UI.Modal.Content>
                <div style = {{ width: '100%', height: '640px' }}>
                    <InventoryView
                        key         = { `${ inventoryViewController.sortMode }.${ inventoryViewController.zoom }` }
                        controller  = { inventoryViewController }
                        onSelect    = {( asset ) => { inventoryViewController.toggleAssetSelection ( asset )}}
                    />
                </div>
            </UI.Modal.Content>
        </UI.Modal>
    );
});

//================================================================//
// StampAssetPreviewModal
//================================================================//
export const StampAssetPreviewModal = observer (( props ) => {

    const { controller, open, setOpen } = props;

    return (
        <If condition = { open }>
            <StampAssetPreviewModalBody
                controller      = { controller }
                open            = { open }
                onClose         = {() => { setOpen ( false )}}
            />
        </If>
    );
});
