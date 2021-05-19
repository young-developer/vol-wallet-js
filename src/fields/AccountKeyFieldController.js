// Copyright (c) 2020 Cryptogogue, Inc. All Rights Reserved.

import { FieldController } from './FieldController'
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';

//================================================================//
// AccountKeyFieldController
//================================================================//
export class AccountKeyFieldController extends FieldController {

    //----------------------------------------------------------------//
    constructor ( accountService, fieldName, initialValue ) {
        super ( fieldName );
        this.accountService = accountService;

        extendObservable ( this, {
            keyName:        initialValue || '',
        });
    }

    //----------------------------------------------------------------//
    virtual_toTransactionFieldValue () {
        return this.keyName;
    }
}
