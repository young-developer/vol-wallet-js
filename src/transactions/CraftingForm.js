// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { CraftingAssetSelectionModal }      from './CraftingAssetSelectionModal';
import { CraftingImagePickerModal }         from './CraftingImagePickerModal';
import { TransactionBalanceHeader }         from './TransactionForm';
import { AssetCardView }                    from 'cardmotron';
import { assert, excel, hooks, RevocableContext, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import React, { useState }                  from 'react';
import * as UI                              from 'semantic-ui-react';

//================================================================//
// InvocationAssetParamRow
//================================================================//
const InvocationAssetParamRow = observer (( props ) => {

    const { controller, paramName, invocation, setParamModalState } = props;

    let name = '';
    const assetID = invocation.assetParams [ paramName ] || '';

    if ( assetID ) {
        const asset = controller.inventory.rawAssets [ assetID ];
        name = controller.inventory.schema.getFriendlyNameForAsset ( asset );
    }

    return (
        <UI.Table.Row
            key = { paramName }
            onClick = {() => {
                setParamModalState ({
                    invocation:     invocation,
                    paramName:      paramName,
                });
            }}
            error = { props.error }
        >
            <UI.Table.Cell collapsing>
                { paramName }
            </UI.Table.Cell>

            <UI.Table.Cell>
                { name }
            </UI.Table.Cell>

            <If condition = { name !== assetID }>
                <UI.Table.Cell collapsing>
                    { assetID }
                </UI.Table.Cell>
            </If>
        </UI.Table.Row>
    );
});

//================================================================//
// InvocationConstImageParamRow
//================================================================//
const InvocationConstImageParamRow = observer (( props ) => {

    const { controller, paramName, invocation } = props;
    const [ showModal, setShowModal ] = useState ( false );

    const imageURL = invocation.constParams [ paramName ].value || '';

    const setImageURL = ( url ) => {
        controller.setConstParam ( invocation, paramName, url );
    }

    // TODO: this is a fucking hack that makes me want to stab myself.
    // but it is late, and I am not going to fight Semantic UI any more right now.
    const displayURL = ( imageURL.length > 45 ) ? `${ imageURL.substr ( 0, 42 )}...` : imageURL;

    return (
        <React.Fragment>
            <UI.Table.Row
                key = { paramName }
                onClick = {( e ) => {
                    setShowModal ( true );
                }}
                error = { props.error }
            >
                <UI.Table.Cell collapsing>
                    { paramName }
                </UI.Table.Cell>

                <UI.Table.Cell colSpan='2'>
                    { displayURL }
                </UI.Table.Cell>
            </UI.Table.Row>

            <CraftingImagePickerModal
                open                    = { showModal }
                onClose                 = {() => { setShowModal ( false )}}
                imageURL                = { imageURL }
                setImageURL             = { setImageURL }
            />
        </React.Fragment>
    );
});

//================================================================//
// InvocationConstStringParamRow
//================================================================//
const InvocationConstStringParamRow = observer (( props ) => {

    const { controller, paramName, invocation } = props;

    const value = invocation.constParams [ paramName ].value || '';

    const setValue = ( value ) => {
        controller.setConstParam ( invocation, paramName, value );
    }

    return (
        <React.Fragment>
            <UI.Table.Row key = { paramName } error = { props.error }>
                <UI.Table.Cell collapsing>
                    { paramName }
                </UI.Table.Cell>

                <UI.Table.Cell colSpan='2'>
                    <UI.Form.Input
                        fluid
                        placeholder     = 'String Param'
                        type            = 'string'
                        name            = { paramName }
                        value           = { value }
                        onChange        = {( event ) => { setValue ( event.target.value )}}
                    />
                </UI.Table.Cell>
            </UI.Table.Row>
        </React.Fragment>
    );
});

//================================================================//
// InvocationConstTextParamRow
//================================================================//
const InvocationConstTextParamRow = observer (( props ) => {

    const { controller, paramName, invocation } = props;

    const value = invocation.constParams [ paramName ].value || '';

    const setValue = ( value ) => {
        controller.setConstParam ( invocation, paramName, value );
    }

    return (
        <React.Fragment>
            <UI.Table.Row key = { paramName } error = { props.error }>
                <UI.Table.Cell collapsing>
                    { paramName }
                </UI.Table.Cell>

                <UI.Table.Cell colSpan='2'>
                    <UI.Form.TextArea
                        rows            = '6'
                        placeholder     = 'Text Param'
                        name            = { paramName }
                        value           = { value }
                        onChange        = {( event ) => { setValue ( event.target.value )}}
                    />
                </UI.Table.Cell>
            </UI.Table.Row>
        </React.Fragment>
    );
});

//================================================================//
// InvocationConstParamRow
//================================================================//
const InvocationConstParamRow = observer (( props ) => {

    const inputSchemeType = props.invocation.method.constArgs [ props.paramName ].inputScheme.type;

    switch ( inputSchemeType ) {
        case 'image':               return <InvocationConstImageParamRow { ...props }/>;
        case 'string':              return <InvocationConstStringParamRow { ...props }/>;
        case 'text':                return <InvocationConstTextParamRow { ...props }/>;
    }
});

//================================================================//
// InvocationField
//================================================================//
const InvocationField = observer (( props ) => {

    const { controller, invocation, index } = props;
    const [ paramModalState, setParamModalState ] = useState ( false );

    const paramList = [];

    for ( let paramName in invocation.assetParams ) {
        paramList.push (
            <InvocationAssetParamRow
                key         = { paramName }
                paramName   = { paramName }
                controller  = { controller }
                invocation  = { invocation }
                setParamModalState = { setParamModalState }
                error       = { invocation.hasErrors ? invocation.errorReport.paramErrors [ paramName ] : undefined }
            />
        );
    }

    for ( let paramName in invocation.constParams ) {
        paramList.push (
            <InvocationConstParamRow
                key         = { paramName }
                paramName   = { paramName }
                controller  = { controller }
                invocation  = { invocation }
                error       = { invocation.hasErrors ? invocation.errorReport.paramErrors [ paramName ] : undefined }
            />
        );
    }

    return (
        <React.Fragment>

            <CraftingAssetSelectionModal
                controller          = { controller }
                paramModalState     = { paramModalState }
                setParamModalState  = { setParamModalState }
            />

            <UI.Menu
                attached = 'top'
                color = { invocation.hasErrors ? 'red' : 'teal' }
                borderless
                inverted
                compact
            >
                <UI.Menu.Item header>
                    { invocation.method.friendlyName }
                </UI.Menu.Item>
                <If condition = { controller.singleInvocation !== true }>
                    <UI.Menu.Menu position = 'right'>
                        <UI.Menu.Item
                            icon = 'times circle'
                            onClick = {() => { controller.removeInvocation ( index )}}
                        />
                    </UI.Menu.Menu>
                </If>
            </UI.Menu>

            <UI.Table attached = 'bottom' celled unstackable>
                <UI.Table.Body>
                    { paramList }
                </UI.Table.Body>
            </UI.Table>

        </React.Fragment>
    );
});

//================================================================//
// MethodDropdown
//================================================================//
const MethodDropdown = observer (( props ) => {

    const { controller, addInvocation } = props;

    let dropdownOptions = [];
    let hasValidMethod = false;

    const binding = controller.binding;
    for ( let methodName in binding.methodsByName ) {

        const method = binding.methodsByName [ methodName ];
        const isValid = binding.methodIsValid ( methodName );
        
        dropdownOptions.push (
            <UI.Dropdown.Item
                key         = { methodName }
                text        = { method.friendlyName }
                disabled    = { !isValid }
                onClick     = {( event, data ) => { addInvocation ( methodName )}}
            />
        );
        hasValidMethod = hasValidMethod || isValid;
    }

    return (
        <UI.Form.Dropdown
            fluid
            selection
            options     = { dropdownOptions }
            text        = 'Add Command'
            disabled    = { !( hasValidMethod && controller.canAddInvocation )}
        />
    );
});

//================================================================//
// CraftingForm
//================================================================//
export const CraftingForm = observer (( props ) => {

    const { controller } = props;

    const addInvocation = ( methodName ) => {
        controller.addInvocation ( methodName );
    }

    const invocationFields = [];
    for ( let i in controller.invocations ) {
        invocationFields.push (
            <InvocationField
                key         = { i }
                controller  = { controller }
                invocation  = { controller.invocations  [ i ]}
                index       = { i }
            />
        );
    }

    const showDropdown = controller.singleInvocation !== true;

    return (
        <React.Fragment>
            <UI.Segment>

                { invocationFields }

                <If condition = { controller.hasErrors }>
                    <UI.Message icon negative>
                        <UI.Icon name = 'warning circle'/>
                        <UI.Message.Content>
                            <UI.Message.Header>Error</UI.Message.Header>
                            <p>One or more invocations has param or constraint errors.</p>
                        </UI.Message.Content>
                    </UI.Message>
                </If>

                <If condition = { showDropdown }>
                    <MethodDropdown
                        key             = { controller.invocations.length }
                        controller      = { controller }
                        addInvocation   = { addInvocation }
                    />
                </If>

            </UI.Segment>
        </React.Fragment>
    );
});
