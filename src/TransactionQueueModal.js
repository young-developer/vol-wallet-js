// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { PasswordInputField }       from './PasswordInputField';
import { TransactionQueueView }     from './TransactionQueueView';
import React, { useState }          from 'react';
import { observer }                 from 'mobx-react';
import * as UI                      from 'semantic-ui-react';

//================================================================//
// TransactionQueueModal
//================================================================//
export const TransactionQueueModal = observer (( props ) => {

    const { accountService, open, onClose } = props;

    const appState      = accountService.appState;
    const queue         = accountService.transactionQueue;

    const [ count, setCount ]           = useState ( 0 );
    const [ busy, setBusy ]             = useState ( false );
    const [ error, setError ]           = useState ( '' );
    const [ password, setPassword ]     = useState ( '' );

    let clearPassword = () => {
        setPassword ( '' );
        setCount ( count + 1 );
    }
    
    let onClickSubmit = async () => {        

        setBusy ( true );
        setError ( '' );
        clearPassword ();

        queue.clearTransactionError ();

        const nonce = await queue.findNonceAsync ( accountService.accountID );
        setBusy ( false );

        if ( nonce === false ) {
            setError ( 'Could not synchronize nonce. Try again later.' );    
            return;
        }
        await queue.submitTransactionsAsync ( password, nonce );
    };
    
    let onClickClear = async () => {
        setBusy ( true );
        clearPassword ();
        await queue.clearUnacceptedTransactionsAsync ();
        setBusy ( false );
    };

    const transactions = queue.transactions;

    const passwordIsValid = appState.checkPassword ( password );
    const clearEnabled = ( passwordIsValid && queue.canClearTransactions );
    const submitEnabled = ( passwordIsValid && queue.canSubmitTransactions );

    return (
        <UI.Modal
            size = 'small'
            closeIcon
            onClose = {() => { onClose ()}}
            open = { open }
        >
            <UI.Modal.Header>Transaction Queue</UI.Modal.Header>

            <UI.Modal.Content>
                
                <If condition = { queue.hasTransactionError }>
                    <UI.Message
                        error
                        icon            = 'exclamation triangle'
                        header          = 'Transaction Error Occured'
                        content         = { queue.transactionError.message }
                        onDismiss       = {() => { queue.clearTransactionError ()}}
                    />
                </If>

                <TransactionQueueView key = { transactions.length } transactions = { transactions } error = { queue.transactionError }/>

                <If condition = { error }>
                    <UI.Message
                        error
                        icon            = 'exclamation triangle'
                        header          = 'Error'
                        content         = { error }
                        onDismiss       = {() => { setError ( '' )}}
                    />
                </If>

                <UI.Form>
                    <PasswordInputField
                        key             = { count }
                        appState        = { appState }
                        setPassword     = { setPassword }
                        disabled        = { busy }
                    />
                </UI.Form>

            </UI.Modal.Content>

            <UI.Modal.Actions>

                <UI.Button
                    negative
                    disabled            = { busy || !clearEnabled }
                    onClick             = { onClickClear }
                >
                    Clear
                </UI.Button>

                <UI.Button
                    positive
                    disabled            = { busy || !submitEnabled }
                    onClick             = { onClickSubmit }
                    loading             = { busy }
                >
                    Submit
                </UI.Button>

            </UI.Modal.Actions>
        </UI.Modal>
    );
});
