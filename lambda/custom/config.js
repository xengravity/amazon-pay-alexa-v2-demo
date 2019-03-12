/**
    To run the skill, the minimum values you need configure are: sellerId, sandboxCustomerEmailId, and bucketName

    A detailed list of attribute descriptions can be found here:
    https://developer.amazon.com/docs/amazon-pay/amazon-pay-apis-for-alexa.html    
**/

'use strict';
const utilities = require( 'utilities' );

// Setup & Charge Payload attributes
const GENERAL = {
    VERSION:                            '2.0',                                      // Required; 
    needAmazonShippingAddress:          true,                                       // Optional; Must be boolean
    paymentAction:                      'AuthorizeAndCapture',                      // Required; 'Authorize' or 'AuthorizeAndCapture'
    transactionTimeout:                 0,                                          // Optional; The default value for Alexa transactions is 0
    scope:                              'payments:autopay_consent',                 // Required; Used request permissions for Amazon Pay
    bucketName:                         'no-nicks-daneu'                            // Required; Used for S3 state management
};

const REGIONAL = {
    'en-US': {
        sellerId:                       'A3HPHFDCJJZ55Q',                           // Required; Amazon Pay seller ID 
        checkoutLanguage:               'en_US',                                    // Optional; US must be en_US
        countryOfEstablishment:         'US',                                       // Required;
        ledgerCurrency:                 'USD',                                      // Required;
        sandboxMode:                    true,                                       // Optional; Must be false for certification || production; Must be true for sandbox testing
        sandboxCustomerEmailId:         'daneu+lwa3@amazon.lu',                     // Optional; Required if sandboxMode equals true; Must setup Amazon Pay test account first
        sellerAuthorizationNote:        utilities.getSimulationString( '' ),        // Optional; Max 255 chars
        softDescriptor:                 'No Nicks',                                 // Optional; Please provide a meaningful value, this is visibla on the buyers' statements. Max 16 chars.
        amount:                         '0.01',                                     // Required; Max $150,000.00 USD
        currencyCode:                   'USD',                                      // Required;

        // SELLER ORDER ATTRIBUTES
        customInformation:              '',                                         // Optional; Max 1024 chars
        sellerNote:                     'Thanks for shaving with No Nicks',         // Optional; Max 1024 chars, visible on confirmation mails to buyers
        sellerStoreName:                'No Nicks',                                 // Optional; Documentation calls this out as storeName not sellerStoreName
        // for card logo
        storeLogoURL:                   'https://s3-us-west-2.amazonaws.com/tcordov/no-nicks-logo-512.png'
    }
};

module.exports = {
    'GENERAL': GENERAL,
    'REGIONAL': REGIONAL,
};