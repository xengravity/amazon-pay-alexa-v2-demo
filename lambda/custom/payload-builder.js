let config = require('config').AMAZON_PAY
let util = require('utilities');
const localization = require('localization');

const setupPayloadVersioning = {
    type: 'SetupAmazonPayRequest',
    version: '2'
}

const processPayloadVersioning = {
    type: 'ChargeAmazonPayRequest',
    version: '2'
}

var setupPayload = function (language) {

    const localizationClient = localization.getClientForPayload(language);
    const regionalConfig = config.REGIONAL[language];
    const generalConfig = config.GENERAL;
    var payload = {
        '@type': setupPayloadVersioning.type,
        '@version': setupPayloadVersioning.version,
        'sellerId': regionalConfig.MERCHANT_ID,
        'countryOfEstablishment': regionalConfig.COUNTRY_OF_ESTABLISHMENT,
        'ledgerCurrency': regionalConfig.LEDGER_CURRENCY,
        'checkoutLanguage': language,
        'sandboxCustomerEmailId': regionalConfig.SANDBOX_CUSTOMER_EMAIL,
        'sandboxMode': regionalConfig.SANDBOX,
        'needAmazonShippingAddress': generalConfig.NEED_AMAZON_SHIPPING_ADDRESS,
        'billingAgreementAttributes': {
            '@type': 'BillingAgreementAttributes',
            '@version': '2',
            'sellerNote': localizationClient.t('SELLER_NOTE'),
            'platformId': generalConfig.PLATFORM_ID,
            'sellerBillingAgreementAttributes': {
                '@type': 'SellerBillingAgreementAttributes',
                '@version': '2',
                //'sellerBillingAgreementId': SOME RANDOM STRING,
                'storeName': localizationClient.t('STORE_NAME'),
                'customInformation': localizationClient.t('CUSTOM_INFO')
            }
        }
    };

    return payload;
};

var chargePayload = function (billingAgreementId, authorizationReferenceId, sellerOrderId, amount, language) {

    const localizationClient = localization.getClientForPayload(language);
    const regionalConfig = config.REGIONAL[language];
    const generalConfig = config.GENERAL;
    var payload = {
        '@type': processPayloadVersioning.type,
        '@version': processPayloadVersioning.version,
        'sellerId': regionalConfig.MERCHANT_ID,
        'billingAgreementId': billingAgreementId,
        'paymentAction': generalConfig.PAYMENT_ACTION,
        'authorizeAttributes': {
            '@type': 'AuthorizeAttributes',
            '@version': '2',
            'authorizationReferenceId': authorizationReferenceId,
            'authorizationAmount': {
                '@type': 'Price',
                '@version': '2',
                'amount': amount.toString(),
                'currencyCode': regionalConfig.LEDGER_CURRENCY
            },
            'transactionTimeout': generalConfig.TRANSACTION_TIMEOUT,
            'sellerAuthorizationNote': localizationClient.t('SELLER_AUTH_NOTE'), // util.getSimulationString('AmazonRejected'), 
            'softDescriptor': localizationClient.t('AUTH_SOFT_DESCRIPTOR')
        },
        'sellerOrderAttributes': {
            '@type': 'SellerOrderAttributes',
            '@version': '2',
 //           'sellerOrderId': sellerOrderId,
            'storeName': localizationClient.t('STORE_NAME'),
            'customInformation': localizationClient.t('CUSTOM_INFO'),
            'sellerNote': localizationClient.t('SELLER_NOTE')
        }
    };
    return payload;
};


module.exports = {
    'setupPayload': setupPayload,
    'chargePayload': chargePayload
};
