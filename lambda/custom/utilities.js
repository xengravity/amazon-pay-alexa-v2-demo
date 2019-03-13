'use strict';
const Jargon = require('@jargon/alexa-skill-sdk');
const ri = Jargon.ri;
const stringify = require('json-stringify-safe');
const products         = require( 'products' );

/**
    A detailed list simulation strings to use in sandboxMode can be found here:
    https://pay.amazon.com/us/developer/documentation/lpwa/201956480#201956480

    Used for testing simulation strings in sandbox mode
**/

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

// Sometimes you just need a random string, right?
function generateRandomString( length ) {
    let randomString 	= '';
    const stringValues 	= 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for ( let i = 0; i < length; i++ )
        randomString += stringValues.charAt( Math.floor( Math.random( ) * stringValues.length ) );

    return randomString;
}

// Get intent slot values
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

// Prevent a previous session's setup from being called prematurely 
function resetSetup ( handlerInput ) {
	const { attributesManager } 	= handlerInput;
	let attributes                  = attributesManager.getSessionAttributes( );

	attributes.setup                = false;
	attributesManager.setSessionAttributes( attributes );  	
}

function findProductRepresentation( productType, shippingAddress ){
    var product = {
        productPrice: null,
        subscriptionPrice: null,
        voiceRepresenation: null,
        intentResponse: null
    };
    const storeName = ri( "store.name" );
    const checkoutQuestion = ri( "summary.checkoutQuestion" );
    let subscriptionDetails = "";
    switch ( productType ) {
        case products.KIT:
            product.productPrice = 9;
            product.voiceRepresenation = ri( "products.starterKit" );
            product.intentResponse = ri ( "summary.cartDetails", {
                sellerStoreName: storeName,
                productType: product.voiceRepresenation,
                productPrice: product.productPrice,
                shippingAddress: shippingAddress,
                subscriptionDetails: subscriptionDetails,
                checkoutQuestion: checkoutQuestion
            } )
            break;

        case products.REFILL:
            product.productPrice = 20;
            product.subscriptionPrice = 20;
            product.voiceRepresenation = ri( "products.refill" );
            subscriptionDetails = ri( "summary.subscriptionDetails", {
                subscriptionPrice: product.subscriptionPrice
            } );
            product.intentResponse = ri ( "summary.cartDetails", {
                sellerStoreName: storeName,
                productType: product.voiceRepresenation,
                productPrice: product.productPrice,
                shippingAddress: shippingAddress,
                subscriptionDetails: subscriptionDetails,
                checkoutQuestion: checkoutQuestion
            } );
            break;

        case products.UPGRADE:
            product.productPrice = 9;
            product.subscriptionPrice = 18;
            product.voiceRepresenation = ri( "products.upgrade" );
            subscriptionDetails = ri( "summary.subscriptionDetails", {
                subscriptionPrice: product.subscriptionPrice
            } );
            product.intentResponse = ri ( "summary.cartDetails", {
                sellerStoreName: storeName,
                productType: product.voiceRepresenation,
                productPrice: product.productPrice,
                shippingAddress: shippingAddress,
                subscriptionDetails: subscriptionDetails,
                checkoutQuestion: checkoutQuestion
            } );
            break;

        default:
            console.log( 'Setup Error with productType' );
    }
    return product;
}

function handleMissingPermission( handlerInput, scope ) {
    const permissions           = handlerInput.requestEnvelope.context.System.user.permissions;
    const amazonPayPermission   = permissions.scopes[ scope ];

    if ( amazonPayPermission.status === 'DENIED' ) {
        return handlerInput.jrb
                            .speak( ri( 'enablePermission' ) )
                            .withAskForPermissionsConsentCard( [ scope ] )
                            .withShouldEndSession( true )
                            .getResponse();
    }
}

// Output object to console for debugging purposes
function debug( handlerInput, message ) {
	console.log( "debug" + ' ' + message + stringify( handlerInput ) );
}

module.exports = {
    'generateRandomString': 			generateRandomString,
    'getSimulationString': 				getSimulationString,
	'getSlotValues': 					getSlotValues,
	'resetSetup': 						resetSetup,
	'findProductRepresentation': 		findProductRepresentation,
	'handleMissingPermission':          handleMissingPermission,
	'debug': 							debug
};

