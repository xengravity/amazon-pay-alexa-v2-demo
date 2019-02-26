'use strict';

const utilities = require( 'utilities' );

/**
    To run the skill, the minimum values you need configure are: sellerId, and sandboxCustomerEmailId

    A detailed list of attribute descriptions can be found here:
    https://developer.integ.amazon.com/docs/amazon-pay/amazon-pay-apis-for-alexa.html    
**/


// GLOBAL
    const sellerId                      = '';                             // Required; Amazon Pay seller ID 
// daneu@: should we rename to merchantId?
// DIRECTIVE CONFIG
    const directiveType                 = 'Connections.SendRequest';                                        // Required;
    const connectionSetup               = 'Setup';                                                          // Required;    
    const connectionCharge              = 'Charge';                                                         // Required;

// PAYLOAD
    const version                       = '2';                                                              // Required;

// SETUP    
    const checkoutLanguage              = 'en_US';                                                          // Optional; US must be en_US
    const countryOfEstablishment        = 'US';                                                             // Required;
    const ledgerCurrency                = 'USD';                                                            // Required;
    const needAmazonShippingAddress     = true;                                                             // Optional; Must be boolean
    const sandboxMode                   = true;                                                             // Optional; Must be false for certification || production; Must be true for sandbox testing
    const sandboxCustomerEmailId        = '';                         // Optional; Required if sandboxMode equals true; Must setup Amazon Pay test account first

// PROCESS PAYMENT
	const paymentAction 				= 'AuthorizeAndCapture'; 											// Required; Authorize or AuthorizeAndCapture
	const providerAttributes 			= ''; 																// Optional; Required if Solution Provider
	const sellerOrderAttributes 		= ''; 																// Optional;

// AUTHORIZE ATTRIBUTES
	const authorizationReferenceId    	= utilities.generateRandomString( 32 );                 			// Required; Must be unique, max 32 chars
	const sellerAuthorizationNote     	= utilities.getSimulationString( '' );					 			// Optional; Max 255 chars
	const softDescriptor              	= '16charSoftDesc';	                                    			// Optional; Max 16 chars
	const transactionTimeout 			= 0;																// Optional; The default value for Alexa transactions is 0.
				
// AUTHORIZE AMOUNT
	const amount                    	= '0.01';							        						// Required; Max $150,000.00 USD
    const currencyCode               	= 'USD';															// Required;

// SELLER ORDER ATTRIBUTES
    const customInformation           	= 'customInformation max 1024 chars';                      		 	// Optional; Max 1024 chars
    const sellerNote                  	= 'sellerNote max 1024 chars';										// Optional; Max 1024 chars
    const sellerOrderId               	= 'Alexa unique sellerOrderId';                            		 	// Optional; Merchant specific order ID
    const sellerStoreName             	= 'No Nicks';                    			       		        	// Optional; Documentation calls this out as storeName not sellerStoreName

// ADDITIONAL ATTRIBUTES
	const platformId 					= ''; 																// Optional; Used for Solution Providers
	const sellerBillingAgreementId 		= ''; 																// Optional; The merchant-specified identifier of this billing agreement
	const storeName 					= sellerStoreName; 													// Optional; Why is there 2 store names?


/** 
    The following strings DO NOT interact with Amazon Pay
    They are here to augment the skill

    Order Summary, Order Confirmation, Cancel and Refund Custom Intents are required for certification:
    https://developer.amazon.com/docs/amazon-pay/certify-skill-with-amazon-pay.html
**/


// LAUNCH INTENT
    const launchRequestWelcomeTitle        = 'Welcome to '+ sellerStoreName + '. '; 
	const launchRequestWelcomeResponse     = launchRequestWelcomeTitle +'We have everything you need for the perfect shave.';
	const launchRequestQuestionResponse    = 'Are you interested in a starter kit, or refills?';

// NO INTENT	
    const noIntentResponse 				   = 'Okay. Your order won\'t be placed.';										 

// CARD INFORMATION
	const storeURL						   = 'www.nonicks.com';
    const logoURL                          = 'https://s3-us-west-2.amazonaws.com/tcordov/no-nicks-logo-512.png';

// CART SUMMARY
    const cartSummaryCheckout              = ' Do you want to check out now?';
    const cartSummarySubscription          = ' Every 2 months, you’ll be charged {subscriptionPrice} dollars for your refill.';
    const cartSummaryResponse              = 'Your total for the ' + sellerStoreName + ' {productType} is {productPrice} dollars and will ship to your address at {shippingAddress}.<break time=".5s"/>';
    
// CANCEL & REFUND CONTACT DETAILS
    const storePhoneNumber                 = '1-234-567-8910';
    const storeEmail                       = 'help@nonicks.com';
    const storeEmailPhonetic               = 'help at no nicks dot com';

// REFUND INTENT - Required
    const refundOrderTitle                 = 'Refund Order Details';
    const refundOrderIntentResponse        = 'To request a refund, email '+ storeEmailPhonetic +', or call us. I sent contact information to your Alexa app.';
    const refundOrderCardResponse          = 'Not completely happy with your order? We are here to help.\n To request a refund, contact us at '+ storePhoneNumber +' or email '+ storeEmail +'.';

// CANCEL INTENT - Required    
    const cancelOrderTitle                 = 'Cancel Order Details';
    const cancelOrderIntentResponse        = 'To request a cancellation, email '+ storeEmailPhonetic +', or call us. I sent contact information to your Alexa app.';
    const cancelOrderCardResponse          = 'Want to change or cancel your order? We are here to help.\n Contact us at '+ storePhoneNumber +' or email '+ storeEmail +'.';
    
// ORDER CONFIRMATION - Required
    const confirmationTitle                = 'Order Confirmation Details';
    const confirmationPlaceOrder           = 'Your order has been placed.';
    const confirmationThanks               = 'Thanks for shaving with '+ sellerStoreName +'.';
    const confirmationIntentResponse       = sellerStoreName + ' will email you when your order ships. Thanks for shaving with '+ sellerStoreName +'.';
    const confirmationItems                = 'Products: 1 {productType}';
    const confirmationTotal                = 'Total amount: ${productPrice}';
    const confirmationTracking             = 'Tracking number: 9400121699000025552416.';
    const confirmationCardResponse         = confirmationPlaceOrder + '\n' +
                                                confirmationItems   + '\n' +
                                                confirmationTotal   + '\n' +
                                                confirmationThanks  + '\n' +
                                                storeURL;
// ORDER TRACKER INTENT
    const orderTrackerTitle                = 'Order Status';
    const orderTrackerIntentResponse       = 'Your order shipped via UPS, and delivery is estimated for this Friday. Check your order email for the tracking number.';
    const orderTrackerCardResponse         = 'Your order #19206 was shipped via UPS and is estimated to arrive on Friday.\n You can check the status at any time using tracking number 9400121699000025552416.';

// HELP INTENT
    const helpCommandsIntentResponse       = 'To check order status, say "where is my order". To cancel an order, say "cancel order." To ask for a refund, say "refund."';

    // Fallback INTENT
    const fallbackHelpMessage = 'Sorry, I didn\'t get this one. ' + sellerStoreName + ' can help you with the following: ' + helpCommandsIntentResponse;

/** 
    The following strings are used to output errors to test the skill
**/


// ERROR RESPONSE STRINGS
    const scope                            = 'payments:autopay_consent';                                        // Required; Used request permissions for Amazon Pay
	const enablePermission 				   = 'To make purchases in this skill, you need to enable Amazon Pay and turn on voice purchasing. To help, I sent a card to your Alexa app.'; 	    // Optional; Used for demo only
	const errorMessage 					   = 'Merchant error occurred. '; 										// Optional; Used for demo only
	const errorUnknown 					   = 'Unknown error occurred. ';
	const errorStatusCode 				   = 'Status code: '; 													// Optional; Used for demo only
	const errorStatusMessage 			   = ' Status message: '; 												// Optional; Used for demo only
	const errorPayloadMessage 			   = ' Payload message: '; 											    // Optional; Used for demo only
	const errorBillingAgreement			   = 'Billing agreement state is ';
	const errorBillingAgreementMessage 	   = '. Reach out to the user to resolve this issue.'; 				    // Optional; Used for demo only
	const authorizationDeclineMessage 	   = 'Your order was not placed and you have not been charged.'; 		// Optional; Used for demo only
    const debug                            = 'debug';                                                           // Optional; Used for demo only


module.exports = {
	// GLOBAL
    'sellerId': 						sellerId,

    // DIRECTIVE CONFIG
    'directiveType': 					directiveType,
    'connectionSetup': 					connectionSetup,
    'connectionCharge': 				connectionCharge,

    // PAYLOAD
    'version':                          version,

    // SETUP
    'countryOfEstablishment': 			countryOfEstablishment,
    'ledgerCurrency': 					ledgerCurrency,
    'checkoutLanguage': 				checkoutLanguage,
    'needAmazonShippingAddress': 		needAmazonShippingAddress,
    'sandboxCustomerEmailId': 			sandboxCustomerEmailId,
    'sandboxMode': 						sandboxMode,

    // PROCESS PAYMENT
    'paymentAction': 					paymentAction,
    'sellerOrderAttributes': 			sellerOrderAttributes,
    'providerAttributes': 				providerAttributes,

    // AUTHORIZE ATTRIBUTES
    'authorizationReferenceId': 		authorizationReferenceId,
    'sellerAuthorizationNote': 			sellerAuthorizationNote,
    'softDescriptor': 					softDescriptor,
    'transactionTimeout': 				transactionTimeout,
    'amount': 							amount,
    'currencyCode': 					currencyCode,
    'sellerOrderId': 					sellerOrderId,
    'sellerStoreName': 					sellerStoreName,
    'customInformation': 				customInformation,
    'sellerNote': 						sellerNote,
    'platformId': 						platformId,
    'sellerBillingAgreementId': 		sellerBillingAgreementId,

    // INTENT RESPONSE STRINGS
    'launchRequestWelcomeTitle':        launchRequestWelcomeTitle,
    'launchRequestWelcomeResponse':    	launchRequestWelcomeResponse,
    'launchRequestQuestionResponse':   	launchRequestQuestionResponse,

    'noIntentResponse': 				noIntentResponse,

    'confirmationTitle':                confirmationTitle,
    'confirmationIntentResponse': 		confirmationIntentResponse,
    'confirmationCardResponse':         confirmationCardResponse,

    'storeURL': 						storeURL,
    'logoURL':                          logoURL,
    'storePhoneNumber':                 storePhoneNumber,

    'cancelOrderTitle':                 cancelOrderTitle,    
    'cancelOrderIntentResponse':        cancelOrderIntentResponse,
    'cancelOrderCardResponse':          cancelOrderCardResponse,

    'cartSummaryCheckout':              cartSummaryCheckout,
    'cartSummarySubscription':          cartSummarySubscription,
    'cartSummaryResponse':              cartSummaryResponse,

    'refundOrderTitle':                 refundOrderTitle,
    'refundOrderIntentResponse':        refundOrderIntentResponse,
    'refundOrderCardResponse':          refundOrderCardResponse,   

    'helpCommandsIntentResponse':       helpCommandsIntentResponse,

    'fallbackHelpMessage':              fallbackHelpMessage,

    'orderTrackerTitle':                orderTrackerTitle,
    'orderTrackerIntentResponse':       orderTrackerIntentResponse,
    'orderTrackerCardResponse':         orderTrackerCardResponse,
    
	// ERROR RESPONSE STRINGS
    'enablePermission': 				enablePermission,
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