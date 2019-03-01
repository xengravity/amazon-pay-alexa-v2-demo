'use strict';

const config = require( 'config' );
const directiveBuilder  = require( 'directive-builder' );
const payloadBuilder    = require( 'payload-builder' );
/**
    A detailed list simulation strings to use in sandboxMode can be found here:
    https://pay.amazon.com/us/developer/documentation/lpwa/201956480#201956480
**/


// Used for testing simulation strings in sandbox mode
function getSimulationString( type ) {
	let simulationString = '';

	switch( type ) {
		case 'InvalidPaymentMethod':
			// PaymentMethodUpdateTimeInMins only works with Async authorizations to change BA back to OPEN; Sync authorizations will not revert
			simulationString = '{ "SandboxSimulation": { "State":"Declined", "ReasonCode":"InvalidPaymentMethod", "PaymentMethodUpdateTimeInMins":1, "SoftDecline":"true" } }';
			break;

		case 'AmazonRejected':
			simulationString = '{ "SandboxSimulation": { "State":"Declined", "ReasonCode":"AmazonRejected" } }';
			break;

		case 'TransactionTimedOut':
			simulationString = '{ "SandboxSimulation": { "State":"Declined", "ReasonCode":"TransactionTimedOut" } }';
			break;
			
		default:
			simulationString = '';
	}

	return simulationString;
}

// Sometimes you just need a random string right?
function generateRandomString( length ) {
    let randomString 	= '';
    const stringValues 	= 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for ( let i = 0; i < length; i++ )
        randomString += stringValues.charAt( Math.floor( Math.random( ) * stringValues.length ) );

    return randomString;
}

function handleMissingAmazonPayPermission( handlerInput ) {
	const permissions 			= handlerInput.requestEnvelope.context.System.user.permissions;
    const amazonPayPermission 	= permissions.scopes[ config.scope ];

    if ( amazonPayPermission.status === 'DENIED' ) {
        return handlerInput.responseBuilder
                            .speak( config.enablePermission )
                            .withAskForPermissionsConsentCard( [ config.scope ] )
                            .getResponse();
    }
}

// Get intent slot values
// Original code from https://github.com/alexa/skill-sample-nodejs-decision-tree/blob/6683cf4d3836e4fc43c573dc0df4d3fd9b5945b5/lambda/custom/index.js#L282
function getSlotValues( filledSlots ) {
	const slotValues = {};

	console.log( `The filled slots: ${JSON.stringify(filledSlots)}` );
	Object.keys( filledSlots ).forEach( ( item ) => {
		const name = filledSlots[ item ].name;

		if ( filledSlots[ item ] &&
			filledSlots[ item ].resolutions &&
			filledSlots[ item ].resolutions.resolutionsPerAuthority[ 0 ] &&
			filledSlots[ item ].resolutions.resolutionsPerAuthority[ 0 ].status &&
			filledSlots[ item ].resolutions.resolutionsPerAuthority[ 0 ].status.code ) {
			switch ( filledSlots[ item ].resolutions.resolutionsPerAuthority[ 0 ].status.code ) {
				case 'ER_SUCCESS_MATCH':
					slotValues[ name ] = {
						synonym: filledSlots[ item ].value,
						resolved: filledSlots[ item ].resolutions.resolutionsPerAuthority[ 0 ].values[ 0 ].value.name,
						isValidated: true,
					};
					break;
				case 'ER_SUCCESS_NO_MATCH':
					slotValues[ name ] = {
						synonym: filledSlots[ item ].value,
						resolved: filledSlots[ item ].value,
						isValidated: false,
					};
					break;
				default:
					break;
			}
		} else {
			slotValues[ name ] = {
				synonym: filledSlots[ item ].value,
				resolved: filledSlots[ item ].value,
				isValidated: false,
			};
		}
	}, this );

	return slotValues;
}

// Customer has shown intent to purchase, call Setup to grab the customers shipping address details
function amazonPaySetup ( handlerInput, productType ) {

    // Save session attributes because skill connection directives will close the session
    const { attributesManager }     = handlerInput;
    let attributes                  = attributesManager.getSessionAttributes( );

    attributes.productType          = productType;
    attributesManager.setSessionAttributes( attributes );
    
    // Permission check
    //utilities.handleMissingAmazonPayPermission( handlerInput );
    const permissions           = handlerInput.requestEnvelope.context.System.user.permissions;
    const amazonPayPermission   = permissions.scopes[ config.scope ];

    if ( amazonPayPermission.status === 'DENIED' ) {
        return handlerInput.responseBuilder
                            .speak( config.enablePermission )
                            .withAskForPermissionsConsentCard( [ config.scope ] )
                            .getResponse();
    }    

    // If you have a valid billing agreement from a previous session, skip the Setup action and call the Charge action instead
    const token                     = generateRandomString( 12 );

    // If you do not have a billing agreement, set the Setup payload and send the request directive
    const setupPayload              = payloadBuilder.setupPayload(handlerInput.requestEnvelope.request.locale);
    const setupRequestDirective     = directiveBuilder.createSetupDirective(setupPayload, token);

    return handlerInput.responseBuilder
                        .addDirective( setupRequestDirective )
                        .withShouldEndSession( true )
                        .getResponse( ); 
}

// Customer has requested checkout and wants to be charged
function amazonPayCharge ( handlerInput ) {

    // Permission check
    //utilities.handleMissingAmazonPayPermission( handlerInput );
    const permissions           = handlerInput.requestEnvelope.context.System.user.permissions;
    const amazonPayPermission   = permissions.scopes[ config.scope ];

    if ( amazonPayPermission.status === 'DENIED' ) {
        return handlerInput.responseBuilder
                            .speak( config.enablePermission )
                            .withAskForPermissionsConsentCard( [ config.scope ] )
                            .getResponse();
    }    

    // Get session attributes
    const { attributesManager }     = handlerInput;
    let attributes                  = attributesManager.getSessionAttributes( );
    const billingAgreementId        = attributes.billingAgreementId;
    const authorizationReferenceId  = generateRandomString( 16 );
    const sellerOrderId             = generateRandomString( 6 );
    const locale                    = handlerInput.requestEnvelope.request.locale;
    const token                     = generateRandomString( 12 );    
    const amount                    = config.REGIONAL[locale].amount;
    
    // Set the Charge payload and send the request directive
    const chargePayload             = payloadBuilder.chargePayload(billingAgreementId, authorizationReferenceId, sellerOrderId, amount, locale);
    const chargeRequestDirective    = directiveBuilder.createChargeDirective(chargePayload, token);

    return handlerInput.responseBuilder
                        .addDirective( chargeRequestDirective )
                        .withShouldEndSession( true )
                        .getResponse( );
}

// Returns product specific string for summary or checkout intent responses
function getResponse ( stage, template, productType, shippingAddress ) {

    let productPrice                = '';
    let subscriptionPrice           = '';
    let cartSummaryResponse         = template;
    let cartSummarySubscription     = config.cartSummarySubscription;
    let confirmationCardResponse    = template;
    let confirmationItem            = '';      

    console.log(productType + ' vs ' + config.products.KIT);

    switch ( productType ) {
        case config.products.KIT:
            productType             = 'Starter Kit';
            confirmationItem        = 'Starter Kit';
            productPrice            = 9;
            cartSummarySubscription = '';
            break;

        case config.products.REFILL:
            confirmationItem        = 'Refill Subscription';   
            productPrice            = 20;
            subscriptionPrice       = 20;
            cartSummarySubscription = cartSummarySubscription.replace( '{subscriptionPrice}', subscriptionPrice );
            break;

        case config.products.UPGRADE:
            productType             = 'Starter Kit';
            confirmationItem        = 'Starter Kit + Refill Subscription';  
            productPrice            = 9;
            subscriptionPrice       = 18;
            cartSummarySubscription = cartSummarySubscription.replace( '{subscriptionPrice}', subscriptionPrice );
            break;

        default:
            console.log( 'Setup Error with productType' );
            cartSummaryResponse     = 'Uh oh, there is an error in the product type in setup.';
            break;
    }

    cartSummaryResponse      = cartSummaryResponse.replace( '{productType}', productType ).replace( '{productPrice}', productPrice ).replace( '{shippingAddress}', shippingAddress );
    cartSummaryResponse      += cartSummarySubscription + config.cartSummaryCheckout;

    confirmationCardResponse = confirmationCardResponse.replace( '{productType}' , confirmationItem ).replace( '{productPrice}' , productPrice );

    if ( stage === 'summary' ) {
        return cartSummaryResponse;
    } else if ( stage === 'confirmation') {
        return confirmationCardResponse;
    }
}

// Prevent a previous session's setup from being called prematurely 
function resetSetup ( handlerInput ) {
	const { attributesManager } 	= handlerInput;
	let attributes                  = attributesManager.getSessionAttributes( );

	attributes.setup                = false;
	attributesManager.setSessionAttributes( attributes );  	
}

module.exports = {
    'generateRandomString': 			generateRandomString,
    'getSimulationString': 				getSimulationString,
	'getSlotValues': 					getSlotValues,
	'handleMissingAmazonPayPermission': handleMissingAmazonPayPermission,
	'amazonPaySetup': 					amazonPaySetup,
	'amazonPayCharge': 					amazonPayCharge,
	'getResponse': 						getResponse,
	'resetSetup': 						resetSetup,

};

