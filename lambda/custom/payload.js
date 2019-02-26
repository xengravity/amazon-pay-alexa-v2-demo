'use strict';

const config    = require( 'config' );

/**
    A detailed list of attributes available to build the payload can be found here:
    https://developer.integ.amazon.com/docs/amazon-pay/amazon-pay-apis-for-alexa.html
**/


// Builds payload for Setup action
function buildSetup ( consentToken ) {
    const payload = {
        '@type':                                    'SetupAmazonPayRequest',
        '@version':                                 config.version,        
        'checkoutLanguage':                         config.checkoutLanguage,
        'countryOfEstablishment':                   config.countryOfEstablishment,
        'ledgerCurrency':                           config.ledgerCurrency,
        'sandboxCustomerEmailId':                   config.sandboxCustomerEmailId,
        'sandboxMode':                              config.sandboxMode,
        'sellerId':                                 config.sellerId,
        'billingAgreementAttributes': {
            '@type':                                'BillingAgreementAttributes',
            '@version':                             config.version,            
            'sellerNote': 							config.sellerNote,
            'sellerBillingAgreementAttributes': {
                '@type':                            'SellerBillingAgreementAttributes',
                '@version':                         config.version,                
                'sellerBillingAgreementId': 		config.sellerBillingAgreementId,
                'storeName': 						config.storeName,
                'customInformation': 				config.customInformation
            }
        },
        'needAmazonShippingAddress': 				config.needAmazonShippingAddress
    };

    return payload;
}

// Builds payload for Charge action
function buildCharge ( consentToken, billingAgreementId ) {
    const payload = {
        '@type':                                    'ChargeAmazonPayRequest',
        '@version':                                 config.version,
        'sellerId':                                 config.sellerId,
        'billingAgreementId':                       billingAgreementId,
        'paymentAction':                            config.paymentAction,
        'authorizeAttributes': {
            '@type':                                'AuthorizeAttributes',
            '@version':                             config.version,            
            'authorizationReferenceId':             config.authorizationReferenceId,
            'authorizationAmount': {
                '@type':                            'Price',
                '@version':                         config.version,                
                'amount':                           config.amount,
                'currencyCode':                     config.currencyCode
            },
            'transactionTimeout':                   config.transactionTimeout,
            'sellerAuthorizationNote':              config.sellerAuthorizationNote,
            'softDescriptor':                       config.softDescriptor
        },
        'sellerOrderAttributes': {
            '@type':                                'SellerOrderAttributes',
            '@version':                             config.version,            
            'sellerOrderId':                        config.sellerOrderId,
            'storeName':                            config.storeName,
            'customInformation':                    config.customInformation,
            'sellerNote':                           config.sellerNote
        }
    };

    return payload;
}

module.exports = {
    'buildSetup':       buildSetup,
    'buildCharge':      buildCharge	
};