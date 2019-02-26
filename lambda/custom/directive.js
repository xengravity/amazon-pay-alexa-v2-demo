'use strict';

const error     = require( 'error-handler' );

/** 
	Directives are messages sent from AVS telling a client to perform a specific action
	Read more here about the interaction model: https://developer.amazon.com/docs/alexa-voice-service/interaction-model.html
**/


function buildDirective( type, name, payload, token ) {

    const directive = {
            'type': type,
            'name': name,
            'payload': payload,
            'token': token
    };

    error.debug( directive, type + ' directive' );

	return directive;
}

module.exports = {
    'buildDirective': buildDirective
};