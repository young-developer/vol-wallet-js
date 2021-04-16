// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import * as Fields                          from '../fields/fields'
import { Transaction, TRANSACTION_TYPE }    from './Transaction';
import { TransactionFormController }        from './TransactionFormController';
import { assert, randomBytes, util }        from 'fgc';
import _                                    from 'lodash';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                         from 'mobx-react';
import { vol }                              from 'vol';

//================================================================//
// OpenAccountFormController
//================================================================//
export class OpenAccountFormController extends TransactionFormController {

    //----------------------------------------------------------------//
    constructor ( accountService ) {
        super ();

        // TODO: replace with something deterministic
        const suffixPart = () => {
            return randomBytes ( 2 ).toString ( 'hex' ).substring ( 0, 3 );
        }
        const suffix = `${ suffixPart ()}.${ suffixPart ()}.${ suffixPart ()}`.toUpperCase ();
        console.log ( 'SUFFIX:', suffix );

        const fieldsArray = [
            new Fields.StringFieldController        ( 'suffix',         'Suffix', suffix ),
            new Fields.TextFieldController          ( 'request',        'New Account Request', 6 ),
            new Fields.VOLFieldController           ( 'grant',          'Grant', 0 ),
        ];
        this.initialize ( accountService, TRANSACTION_TYPE.OPEN_ACCOUNT, fieldsArray );
    }

    //----------------------------------------------------------------//
    @action
    decodeRequest () {

        console.log ( 'DECODE REQUEST', this.fields.request.value );

        const request = vol.decodeAccountRequest ( this.fields.request.value );

        if ( request ) return 'Problem decoding request.';
        if ( !request ) return 'Problem decoding request.';
        if ( !request.key ) return 'Missing key.';
        if ( request.genesis !== this.networkService.genesis ) return 'Genesis block mismatch; this request is for another network.';

        return request;
    }

    //----------------------------------------------------------------//
    virtual_composeBody ( fieldValues ) {

        const request = this.decodeRequest ();

        let body = {
            suffix:     this.fields.suffix.value,
            key:        request && request.key || false,
            grant:      this.fields.grant.value,
        };
        return body;
    }

    //----------------------------------------------------------------//
    @action
    virtual_validate () {

        const encoded = this.fields.request.value || '';

        if ( encoded.length > 0 ) {
            const request = this.decodeRequest ();
            if ( typeof ( request ) === 'string' ) {
                this.fields.request.error = request;
            }
        }
    }
}
