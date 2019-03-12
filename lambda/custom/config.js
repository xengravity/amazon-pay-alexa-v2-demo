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
    bucketName:                         'no-nicks-daneu'                // Required; Used for S3 state management
};

const REGIONAL = {
    'en-US': {
        sellerId:                       'A3HPHFDCJJZ55Q',         // Required; Amazon Pay seller ID 
        checkoutLanguage:               'en_US',                                    // Optional; US must be en_US
        countryOfEstablishment:         'US',                                       // Required;
        ledgerCurrency:                 'USD',                                      // Required;
        sandboxMode:                    true,                                       // Optional; Must be false for certification || production; Must be true for sandbox testing
        sandboxCustomerEmailId:         'daneu+lwa3@amazon.lu',        // Optional; Required if sandboxMode equals true; Must setup Amazon Pay test account first
        sellerAuthorizationNote:        utilities.getSimulationString( '' ),        // Optional; Max 255 chars
        softDescriptor:                 'No Nicks',                                 // Optional; Please provide a meaningful value, this is visibla on the buyers' statements. Max 16 chars.
        amount:                         '0.01',                                     // Required; Max $150,000.00 USD
        currencyCode:                   'USD',                                      // Required;

        // SELLER ORDER ATTRIBUTES
        customInformation:              '',                                         // Optional; Max 1024 chars
        sellerNote:                     'Thanks for shaving with No Nicks',                // Optional; Max 1024 chars, visible on confirmation mails to buyers
        sellerStoreName:                'No Nicks',                                 // Optional; Documentation calls this out as storeName not sellerStoreName
    }
};

/** 
    The following strings DO NOT interact with Amazon Pay
    They are here to augment the skill

    Order Summary, Order Confirmation, Cancel and Refund Custom Intents are required for certification:
    https://developer.amazon.com/docs/amazon-pay/certify-skill-with-amazon-pay.html
**/

// CARD INFORMATION
    const storeLogoURL = "https://s3-us-west-2.amazonaws.com/tcordov/no-nicks-logo-512.png";


// CART SUMMARY
    const cartSummaryCheckout              = ' Do you want to check out now?';
    const cartSummarySubscription          = ' Every 2 months, you’ll be charged {subscriptionPrice} dollars for your refill.';
    const cartSummaryResponse              = 'Your total for the '+ REGIONAL[ 'en-US' ].sellerStoreName +' {productType} is {productPrice} dollars and will ship to your address at {shippingAddress}.<break time=".5s"/>';

    
/** 
    The following strings are used to output errors to test the skill
**/


// ERROR RESPONSE STRINGS
    const scope                            = 'payments:autopay_consent';                                        // Required; Used request permissions for Amazon Pay
	const errorMessage 					   = 'Merchant error occurred. ';
	const errorUnknown 					   = 'Unknown error occurred. ';
	const errorStatusCode 				   = 'Status code: ';
	const errorStatusMessage 			   = ' Status message: ';
	const errorPayloadMessage 			   = ' Payload message: ';
	const errorBillingAgreement			   = 'Billing agreement state is ';
	const errorBillingAgreementMessage 	   = '. Reach out to the user to resolve this issue.';
	const authorizationDeclineMessage 	   = 'Your order was not placed and you have not been charged.';
    const debug                            = 'debug';


module.exports = {
    'GENERAL': GENERAL,
    'REGIONAL': REGIONAL,

    'storeLogoURL': storeLogoURL,

    // INTENT RESPONSE STRINGS

    'cartSummaryCheckout':              cartSummaryCheckout,
    'cartSummarySubscription':          cartSummarySubscription,
    'cartSummaryResponse':              cartSummaryResponse,

	// ERROR RESPONSE STRINGS
    'scope': 							scope,
    'errorMessage': 					errorMessage,
    'errorUnknown': 					errorUnknown,
    'errorStatusCode': 					errorStatusCode,
    'errorStatusMessage': 				errorStatusMessage,
    'errorPayloadMessage': 				errorPayloadMessage,
    'errorBillingAgreement': 			errorBillingAgreement,
    'errorBillingAgreementMessage': 	errorBillingAgreementMessage,
    'authorizationDeclineMessage': 		authorizationDeclineMessage,
    'debug':                            debug
};