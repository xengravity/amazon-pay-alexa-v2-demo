'use strict';

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

function getConsentToken( handlerInput ) {
	const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;

	return consentToken;
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

module.exports = {
    'generateRandomString': generateRandomString,
    'getSimulationString': 	getSimulationString,
    'getConsentToken': 		getConsentToken,
    'getSlotValues': 		getSlotValues
};
