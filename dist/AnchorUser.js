"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnchorUser = void 0;
const universal_authenticator_library_1 = require("universal-authenticator-library");
const eosio_1 = require("@greymass/eosio");
const UALAnchorError_1 = require("./UALAnchorError");
const { notifyError, notifySuccess } = require("../../../../src/stores/notifications");
class AnchorUser extends universal_authenticator_library_1.User {
    constructor(rpc, client, identity) {
        super();
        this.accountName = '';
        this.requestPermission = '';
        const { session } = identity;
        this.accountName = String(session.auth.actor);
        this.chainId = String(session.chainId);
        if (identity.signatures) {
            [this.signerProof] = identity.signatures;
        }
        if (identity.signerKey) {
            this.signerKey = identity.signerKey;
        }
        if (identity.resolvedTransaction) {
            this.signerRequest = identity.transaction;
        }
        this.requestPermission = String(session.auth.permission);
        this.session = session;
        this.client = client;
        this.rpc = rpc;
    }
    objectify(data) {
        return JSON.parse(JSON.stringify(data));
    }
    signTransaction(transaction, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let completedTransaction;
                // If this is not a transaction and expireSeconds is passed, form a transaction
                //   Note: this needs to be done because the session transact doesn't understand eosjs transact options
                if (options.expireSeconds && !transaction.expiration) {
                    const info = yield this.client.v1.chain.get_info();
                    const tx = Object.assign(Object.assign({}, transaction), info.getTransactionHeader(options.expireSeconds));
                    completedTransaction = yield this.session.transact(tx, options);
                }
                else {
                    completedTransaction = yield this.session.transact(transaction, options);
                }
                const wasBroadcast = (options.broadcast !== false);
                const serializedTransaction = eosio_1.PackedTransaction.fromSigned(eosio_1.SignedTransaction.from(completedTransaction.transaction));
                notifySuccess(completedTransaction.processed.id, completedTransaction.processed.receipt.status);
                return this.returnEosjsTransaction(wasBroadcast, Object.assign(Object.assign({}, completedTransaction), { transaction_id: completedTransaction.payload.tx, serializedTransaction: serializedTransaction.packed_trx.array, signatures: this.objectify(completedTransaction.signatures) }));
            }
            catch (e) {
                const message = 'Unable to sign transaction';
                const type = universal_authenticator_library_1.UALErrorType.Signing;
                const cause = e;
                if(e.details){
                    notifyError(e.details[0].message);
                } else {
                    notifyError(type);
                }
                throw new UALAnchorError_1.UALAnchorError(message, type, cause);
            }
        });
    }
    signArbitrary(publicKey, data, _) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new UALAnchorError_1.UALAnchorError(`Anchor does not currently support signArbitrary(${publicKey}, ${data})`, universal_authenticator_library_1.UALErrorType.Unsupported, null);
        });
    }
    verifyKeyOwnership(challenge) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new UALAnchorError_1.UALAnchorError(`Anchor does not currently support verifyKeyOwnership(${challenge})`, universal_authenticator_library_1.UALErrorType.Unsupported, null);
        });
    }
    getAccountName() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.accountName;
        });
    }
    getChainId() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.chainId;
        });
    }
    getKeys() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const keys = yield this.signatureProvider.getAvailableKeys(this.requestPermission);
                return keys;
            }
            catch (error) {
                const message = `Unable to getKeys for account ${this.accountName}.
        Please make sure your wallet is running.`;
                const type = universal_authenticator_library_1.UALErrorType.DataRequest;
                const cause = error;
                throw new UALAnchorError_1.UALAnchorError(message, type, cause);
            }
        });
    }
    isAccountValid() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const account = this.client && (yield this.client.v1.chain.get_account(this.accountName));
                const actualKeys = this.extractAccountKeys(account);
                const authorizationKeys = yield this.getKeys();
                return actualKeys.filter((key) => {
                    return authorizationKeys.indexOf(key) !== -1;
                }).length > 0;
            }
            catch (e) {
                if (e.constructor.name === 'UALAnchorError') {
                    throw e;
                }
                const message = `Account validation failed for account ${this.accountName}.`;
                const type = universal_authenticator_library_1.UALErrorType.Validation;
                const cause = e;
                throw new UALAnchorError_1.UALAnchorError(message, type, cause);
            }
        });
    }
    extractAccountKeys(account) {
        const keySubsets = account.permissions.map((permission) => permission.required_auth.keys.map((key) => key.key));
        let keys = [];
        for (const keySubset of keySubsets) {
            keys = keys.concat(keySubset);
        }
        return keys;
    }
}
exports.AnchorUser = AnchorUser;
