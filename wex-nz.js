'use strict';
var request = require('request'),
    crypto = require('crypto'),
    querystring = require('querystring');

var WEXNZ = function(apiKey, secret, options) {
  this.url = 'https://wex.nz/tapi';
  this.publicApiUrl = 'https://wex.nz/api/3/';
  this.timeout = 5000;
  this.apiKey = apiKey;
  this.secret = secret;
  this._strictSSL = true;

  if (typeof options === 'function') {
    this.nonce = options;
  } else if (options) {
    this.nonce = options.nonce;
    this.agent = options.agent;

    if (typeof options.timeout !== 'undefined') {
      this.timeout = options.timeout;
    }
    if (typeof options.tapi_url !== 'undefined') {
      this.url = options.tapi_url;
    }
    if (typeof options.public_url !== 'undefined') {
      this.publicApiUrl = options.public_url;
    }
    if (typeof options.strict_ssl !== 'undefined') {
      this._strictSSL = !!options.strict_ssl;
    }
  }
};

WEXNZ.prototype._sendRequest = function (options, callback) {
  var self = this;
  var requestOptions = {
    timeout: self.timeout,
    agent: self.agent,
    strictSSL: self._strictSSL
  };

  for (var key in options) {
    requestOptions[key] = options[key];
  }

  request(requestOptions, function(err, response, body) {
    if(err || response.statusCode !== 200) {
      return callback(new Error(err || response.statusCode));
    }

    var result;
    try {
      result = JSON.parse(body);
    } catch(error) {
      return callback(error);
    }

    if(result.error) {
      return callback(new Error(result.error));
    }

    callback(null, result);
  });
};

WEXNZ.prototype.makeRequest = function(method, params, callback) {
  var self = this;

  if(!self.apiKey || !self.secret) {
    return callback(new Error('Must provide API key and secret to use the trade API.'));
  }

  // If the user provided a function for generating the nonce, then use it.
  if(self.nonce) {
    params.nonce = self.nonce();
  } else {
    params.nonce = Math.round((new Date()).getTime() / 1000);
  }

  var formData = {};
  for (var key in params) {
    formData[key] = params[key];
  }
  formData.method = method;

  var form = querystring.stringify(formData);
  var sign = crypto.createHmac('sha512', self.secret).update(new Buffer(form)).digest('hex').toString();

  self._sendRequest({
    url: self.url,
    method: 'POST',
    form: form,
    headers: {
      Sign: sign,
      Key: self.apiKey
    }
  }, callback);
};

WEXNZ.prototype.makePublicApiRequest = function(pair, method, callback) {
  this._sendRequest({
    url: this.publicApiUrl + pair + '/' + method
  }, callback);
};

WEXNZ.prototype.getInfo = function(callback) {
  this.makeRequest('getInfo', {}, callback);
};

WEXNZ.prototype.transHistory = function(params, callback) {
  this.makeRequest('TransHistory', params, callback);
};

WEXNZ.prototype.tradeHistory = function(params, callback) {
  this.makeRequest('TradeHistory', params, callback);
};

WEXNZ.prototype.orderInfo = function(paramsOrOrderId, callback) {
  var inputType = typeof paramsOrOrderId;
  var input = (inputType === 'string' || inputType === 'number') ?
    {order_id: paramsOrOrderId} : paramsOrOrderId;
  this.makeRequest('OrderInfo', input, callback);
};

WEXNZ.prototype.orderList = function(params, callback) {
  this.makeRequest('OrderList', params, callback);
};

WEXNZ.prototype.activeOrders = function(pair, callback) {
  if (!callback) {
    callback = pair;
    pair = null;
  }

  this.makeRequest('ActiveOrders', {pair: pair}, callback);
};

WEXNZ.prototype.trade = function(pair, type, rate, amount, callback) {
  this.makeRequest('Trade', {
    'pair': pair,
    'type': type,
    'rate': rate,
    'amount': amount
  }, callback);
};

WEXNZ.prototype.cancelOrder = function(paramsOrOrderId, callback) {
  var inputType = typeof paramsOrOrderId;
  var input = (inputType === 'string' || inputType === 'number') ?
    {order_id: paramsOrOrderId} : paramsOrOrderId;
  this.makeRequest('CancelOrder', input, callback);
};

WEXNZ.prototype.ticker = function(pair, callback) {
  this.makePublicApiRequest(pair, 'ticker', callback);
};

WEXNZ.prototype.trades = function(pair, callback) {
  this.makePublicApiRequest(pair, 'trades', callback);
};

WEXNZ.prototype.depth = function(pair, callback) {
  this.makePublicApiRequest(pair, 'depth', callback);
};

WEXNZ.prototype.fee = function(pair, callback) {
  this.makePublicApiRequest(pair, 'fee', callback);
};

module.exports = WEXNZ;
