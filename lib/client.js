'use strict';

var request = require('request');
var assert = require('assert');
var storj = require('storj-lib');
var uuid = require('node-uuid');
var merge = require('merge');

/**
 * Creates a RPC client for communicating with a {@link Landlord}
 * @constructor
 * @param {Object} options
 * @param {String} options.rpcUrl - The URL of the Landlord RPC server
 * @param {String} options.rpcUser - Authorization username
 * @param {String} options.rpcPassword - Authorization password
 */
function Client(options) {
  if (!(this instanceof Client)) {
    return new Client(options);
  }

  this._opts = merge(Object.create(Client.DEFAULTS), options);
}

Client.DEFAULTS = {
  rpcUrl: 'http://localhost:8080',
  rpcUser: 'user',
  rpcPassword: 'pass'
};

/**
 * Sends the JSON-RPC message and handles the response
 * @param {String} method
 * @param {Array} args
 * @param {Function} callback
 * @private
 */
Client.prototype._send = function(method, args, callback) {
  request.post(this._opts.rpcUrl, {
    id: uuid.v4(),
    method: method,
    params: this._serializeRequestArguments(method, args)
  }, function(err, body) {
    if (err) {
      return callback(err);
    }

    if (body.error) {
      return callback(new Error(body.error.message));
    }

    callback.apply(
      null,
      self._deserializeResponseArguments(method, body.result)
    );
  });
};

/**
 * Converts response params into storj-lib objects
 * @param {String} method
 * @param {Array} arguments
 * @returns {Array}
 */
Client.prototype._deserializeResponseArguments = function(method, args) {
  switch (method) {
    case 'getStorageOffer':
      args[1] = storj.Contact(args[1]);
      args[2] = storj.Contract.fromObject(args[2]);
      break;
    case 'getStorageProof':
      break;
    case 'getConsignmentPointer':
      args[1] = storj.DataChannelPointer(
        storj.Contact(args[1].farmer),
        args[1].hash,
        args[1].token,
        args[1].operation
      );
      break;
    case 'getRetrievalPointer':
      args[1] = storj.DataChannelPointer(
        storj.Contact(args[1].farmer),
        args[1].hash,
        args[1].token,
        args[1].operation
      );
      break;
    case 'getMirrorNodes':
      args[1] = args[1].map(function(c) {
        return storj.Contact(c);
      });
      break;
    default:
      // noop
  }

  return args;
};

/**
 * Converts storj-lib objects into request params
 * @param {String} method
 * @param {Array} arguments
 * @returns {Array}
 */
Client.prototype._serializeRequestArguments = function(method, args) {
  switch (method) {
    case 'getStorageOffer':
      args[0] = args[0].toObject();
      break;
    case 'getStorageProof':
      break;
    case 'getConsignmentPointer':
      args[1] = args[1].toObject();
      args[2] = {
        challenges: args[2].getPrivateRecord().challenges,
        tree: args[2].getPublicRecord()
      };
      break;
    case 'getRetrievalPointer':
      args[1] = args[1].toObject();
      break;
    case 'getMirrorNodes':
      break;
    default:
      // noop
  }

  return args;
};

/**
 * @see http://storj.github.io/core/RenterInterface.html#getConsignmentPointer__anchor
 */
Client.prototype.getConsignmentPointer = function(farmer, contract, audit, callback) {
  assert(farmer instanceof storj.Contact, 'Invalid contact supplied');
  assert(contract instanceof storj.Contract, 'Invalid contract supplied');
  assert(audit instanceof storj.AuditStream, 'Invalid audit object supplied');
  this._send('getConsignmentPointer', [farmer, contract, audit], callback);
};

/**
 * @see http://storj.github.io/core/RenterInterface.html#getRetrievalPointer__anchor
 */
Client.prototype.getRetrievalPointer = function(farmer, contract, callback) {
  assert(farmer instanceof storj.Contact, 'Invalid contact supplied');
  assert(contract instanceof storj.Contract, 'Invalid contract supplied');
  this._send('getRetrievalPointer', [farmer, contract], callback);
};

/**
 * @see http://storj.github.io/core/RenterInterface.html#getMirrorNodes__anchor
 */
Client.prototype.getMirrorNodes = function(sources, destinations, callback) {
  assert(Array.isArray(sources), 'Invalid sources supplied');
  assert(Array.isArray(destinations), 'Invalid destinations supplied');
  sources.forEach(function(source) {
    assert(source instanceof storj.DataChannelPointer, 'Invalid pointer');
  });
  destinations.forEach(function(dest) {
    assert(dest instanceof storj.Contact, 'Invalid contact');
  });
  this._send('getMirrorNodes', [sources, destinations], callback);
};

/**
 * @see http://storj.github.io/core/RenterInterface.html#getStorageOffer__anchor
 */
Client.prototype.getStorageOffer = function(contract, blacklist, callback) {
  if (typeof blacklist === 'function') {
    callback = blacklist;
    blacklist = [];
  }

  assert(contact instanceof storj.Contract, 'Invalid contract supplied');
  assert(Array.isArray(blacklist), 'Invalid blacklist supplied');
  this._send('getStorageOffer', [farmer, blacklist], callback);
};

/**
 * @see http://storj.github.io/core/RenterInterface.html#getStorageProof__anchor
 */
Client.prototype.getStorageProof = function(farmer, item, callback) {
  assert(farmer instanceof storj.Contact, 'Invalid contact supplied');
  assert(item instanceof storj.StorageItem, 'Invalid storage item supplied');
  this._send('getStorageProof', [farmer, item], callback)
};

module.exports = Client;