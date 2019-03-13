/**
    This skill is built for Nodejs using Alexa ASK V2.0.3 
    Download the SDK here: https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs
**/

'use strict';

const Alexa            = require( 'ask-sdk-core' );
const Jargon = require('@jargon/alexa-skill-sdk');
const ri = Jargon.ri;
const config            = require( 'config' );
const error             = require( 'error-handler' );
const utilities         = require( 'utilities' );
const products         = require( 'products' );
const directiveBuilder  = require( 'directive-builder' );
const payloadBuilder    = require( 'payload-builder' );
const s3Adapter         = require( 'ask-sdk-s3-persistence-adapter' ).S3PersistenceAdapter;
let persistence         = '';

const stringify = require('json-stringify-safe');

// Welcome, are you interested in a starter kit or a refill subscription?
const LaunchRequestHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle( handlerInput ) {
        // Prevent a previous session's setup from being called prematurely 
        utilities.resetSetup( handlerInput );

        const storeName = ri('store.name');
        const storeURL = ri( "store.websiteURL" );
        const welcomeTitle = ri('welcome.title', {storeName: storeName});
        const welcomeResponse = ri('welcome.response');
        const welcomeQuestion = ri('welcome.question');

        const locale                    = handlerInput.requestEnvelope.request.locale;

        return handlerInput.jrb
                            .speak( welcomeTitle )
                            .speak( welcomeResponse )
                            .speak( welcomeQuestion )
                            .withStandardCard( welcomeTitle, storeURL, config.REGIONAL[locale].storeLogoURL )
                            .reprompt( welcomeQuestion )
                            .withShouldEndSession( false )
				            .getResponse( );
    }
};

// Do you want to purchase a starter kit, upgrade the starter kit, or buy something else?
const InProgressStarterKitIntent = {
    canHandle( handlerInput ) {
        const request = handlerInput.requestEnvelope.request;

        return request.type         === 'IntentRequest' &&
               request.intent.name  === 'StarterKitIntent' &&
               request.dialogState  !== 'COMPLETED';
    },
    handle( handlerInput ) {
        const currentIntent = handlerInput.requestEnvelope.request.intent;

        for ( const slotName of Object.keys( handlerInput.requestEnvelope.request.intent.slots ) ) {
            const currentSlot = currentIntent.slots[ slotName ];

            if ( currentSlot.confirmationStatus !== 'CONFIRMED' && currentSlot.resolutions && currentSlot.resolutions.resolutionsPerAuthority[ 0 ] ) {
                if ( currentSlot.resolutions.resolutionsPerAuthority[ 0 ].status.code === 'ER_SUCCESS_MATCH' ) {
                    const currentSlotValue = currentSlot.resolutions.resolutionsPerAuthority[ 0 ].values[ 0 ].value.name;                  
                    
                    // No, I do not want to buy the starter kit
                    if ( currentSlot.name === 'KitPurchaseIntentSlot' && currentSlotValue === 'no' ) {
                        
                        // Do you want to buy something else?
                        const { attributesManager } = handlerInput;
                        let attributes              = attributesManager.getSessionAttributes( );

                        attributes.reengage         = true;
                        attributesManager.setSessionAttributes( attributes );  

                        return handlerInput.jrb
                            .speak( ri( 'noIntentToBuyResponse' ) )
                            .withShouldEndSession( false )
                            .getResponse( );
                    }

                    // No, I do not want to upgrade, just buy the starter kit
                    if ( currentSlot.name === 'UpgradeKitIntentSlot' && currentSlotValue === 'no' ) {
                        return amazonPaySetup( handlerInput, products.KIT );
                    }

                    // Yes, I do want to upgrade the starter kit
                    if ( currentSlot.name === 'UpgradeKitIntentSlot' && currentSlotValue === 'yes' ) {
                        return amazonPaySetup( handlerInput, products.UPGRADE );                  
                    }

                    // TODO: Combine refill subscription logic here

                } else {
                    utilities.debug( 'Error: Had no match for products' );
                }
            } 
        }

        return handlerInput.jrb
                            .addDelegateDirective( currentIntent )
                            .getResponse( );
    }
};

// Do you want to buy a refill subscription or buy something else?
const CompletedRefillIntentHandler = {
    canHandle( handlerInput ) {
        const request = handlerInput.requestEnvelope.request;

        return request.type         === 'IntentRequest' && 
               request.intent.name  === 'RefillIntent' && 
               request.dialogState  === 'COMPLETED';
    },
    handle( handlerInput ) {
        const filledSlots           = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues            = utilities.getSlotValues( filledSlots );
        const yesNoResponse         = `${ slotValues.RefillPurchaseIntentSlot.resolved }`;

        // No, I do not want to buy the refill subscription
        if ( yesNoResponse === 'no' ){
            
            // Do you want to buy something else?
            const { attributesManager }     = handlerInput;
            let attributes                  = attributesManager.getSessionAttributes( );

            attributes.reengage             = true;
            attributesManager.setSessionAttributes( attributes );  
            
            return handlerInput.jrb
                                .speak( ri('noIntentToBuyResponse') )
                                .withShouldEndSession( false )
                                .getResponse();
        } else {
            // Yes, I want to buy the refill subscription
            return amazonPaySetup( handlerInput, products.REFILL );  
        }
    }
};

// I want to place my order
const YesIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type         === 'IntentRequest' && 
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
    },
    handle( handlerInput ) {
        const { attributesManager } = handlerInput;
        let attributes              = attributesManager.getSessionAttributes( );
        const setupDirectiveSent    = attributes.setup;

        if ( attributes.reengage ) {
            attributes.reengage     = false;
            attributesManager.setSessionAttributes( attributes );

            return handlerInput.jrb
                                .speak( ri( "welcome.question" ) )
                                .reprompt( ri( "welcome.question" ) )
                                .withShouldEndSession( false )
                                .getResponse( );
        }

        // Did we already send the setup directive request?
        if ( setupDirectiveSent ) {
            utilities.resetSetup( handlerInput );

            // Charge the user
            return amazonPayCharge( handlerInput );
        } else {
            // This is added with the intent that it is developer facing only
            // Do not leave this here for production skills as customers will recieve these messages
            return handlerInput.jrb
                                .speak( 'Error: Check the yes intent handler' )
                                .withShouldEndSession( false )
                                .getResponse( );
        }
    }
};

// No, I don't want to do that
const NoIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type        === 'IntentRequest' &&
               handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
    },
    handle( handlerInput ) {
        const { attributesManager }     = handlerInput;
        let attributes                  = attributesManager.getSessionAttributes( );       
        
        if( attributes.reengage ) {
            attributes.reengage         = false;
            attributesManager.setSessionAttributes( attributes );

            return ExitSkillIntentHandler.handle( handlerInput );
        }  

        if( attributes.setup ) {
            // Customer decided to not checkout, while having filled the cart already
            attributes.reengage         = true;
            attributesManager.setSessionAttributes( attributes );  

            return handlerInput.jrb
                                .speak( ri('noIntentToBuyResponse') )
                                .withShouldEndSession( false )
                                .getResponse( );
        }

        // Catch unexpected No's
        return FallbackIntentHandler.handle( handlerInput );
    }
};

// You requested the Setup directive and are now receiving the Connections.Response
const SetupConnectionsResponseHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type  === 'Connections.Response' &&
                handlerInput.requestEnvelope.request.name === directiveBuilder.setupDirectiveName;
    },
    handle( handlerInput ) {
        const connectionResponsePayload     = handlerInput.requestEnvelope.request.payload;
        const connectionResponseStatusCode  = handlerInput.requestEnvelope.request.status.code;

        // If there are integration or runtime errors, do not charge the payment method
        if ( connectionResponseStatusCode != 200 ) {
            return error.handleErrors( handlerInput );
        }

        // Get the billingAgreementId and billingAgreementStatus from the Setup Connections.Response
        const billingAgreementId 			= connectionResponsePayload.billingAgreementDetails.billingAgreementId;
        const billingAgreementStatus 		= connectionResponsePayload.billingAgreementDetails.billingAgreementStatus;              

         // If billingAgreementStatus is valid, Charge the payment method    
        if ( billingAgreementStatus === 'OPEN' ) {

            // Save billingAgreementId attributes because directives will close the session
            const { attributesManager }     = handlerInput;
            let attributes                  = attributesManager.getSessionAttributes( );

            attributes.billingAgreementId   = billingAgreementId;
            attributes.setup                = true;
            attributesManager.setSessionAttributes( attributes );                      

            let shippingAddress           = connectionResponsePayload.billingAgreementDetails.destination.addressLine1;
            if(shippingAddress === undefined){
                shippingAddress           = connectionResponsePayload.billingAgreementDetails.destination.addressLine2;
            }

            let productType                 = attributes.productType;
            const product = utilities.findProductRepresentation( productType, shippingAddress);

            return handlerInput.jrb
                                .speak( product.intentResponse )
                                .withShouldEndSession( false )
                                .getResponse( );                    

        // If billingAgreementStatus is not valid, do not Charge the payment method	
        } else {
            return error.handleBillingAgreementState( billingAgreementStatus, handlerInput );
        }
    }
};

// You requested the Charge directive and are now receiving the Connections.Response
const ChargeConnectionsResponseHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type    === 'Connections.Response' &&
                handlerInput.requestEnvelope.request.name   === directiveBuilder.chargeDirectiveName;
    },
    handle( handlerInput ) {
        const connectionResponsePayload     = handlerInput.requestEnvelope.request.payload;
        const connectionResponseStatusCode  = handlerInput.requestEnvelope.request.status.code;

    	// If there are integration or runtime errors, do not charge the payment method
        if ( connectionResponseStatusCode != 200 ) {
            return error.handleErrors( handlerInput );
        } 

        const authorizationStatusState = connectionResponsePayload.authorizationDetails.state;
        
        // Authorization is declined, tell the customer their order was not placed
        if( authorizationStatusState === 'Declined' ) {
            const authorizationStatusReasonCode = connectionResponsePayload.authorizationDetails.reasonCode;

            return error.handleAuthorizationDeclines( authorizationStatusReasonCode, handlerInput );

        // CERTIFICATION REQUIREMENT 
        // Authorization is approved, tell the customer their order was placed and send them a card with order details  
        } else {
            // Get the productType attribute
            const { attributesManager }     = handlerInput;
            let attributes                  = attributesManager.getSessionAttributes( );             
            const productType               = attributes.productType;

            const cardTitle = ri( "confirmation.card.title" );
            const storeName = ri ( "store.name" );
            const storeURL = ri( "store.websiteURL" );
            const product = utilities.findProductRepresentation( productType );

            const locale                    = handlerInput.requestEnvelope.request.locale;

            const cardContent = ri( "confirmation.card.content", { 
                productType: product.voiceRepresenation, 
                productPrice: product.productPrice, 
                storeName: storeName, 
                storeURL: storeURL } 
            );

            const intentResponse = ri( "confirmation.intent.response", {sellerStoreName: storeName});

            return handlerInput.jrb
                                .speak( intentResponse )
                                .withStandardCard( cardTitle, cardContent, config.REGIONAL[locale].storeLogoURL )
                                .withShouldEndSession( true )
                                .getResponse( );
        }
    }
};

// CERTIFICATION REQUIREMENT
// Tell the customer how they can request a refund
const RefundOrderIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
               handlerInput.requestEnvelope.request.intent.name === 'RefundOrderIntent';
    },
    handle( handlerInput ) {
        const cardTitle = ri( "refund.card.title" );
        const email = ri( "store.email" );
        const phone = ri( "store.phone" );
        const cardContent = ri( "refund.card.content", {storePhoneNumber: phone, storeEmail: email} );

        const emailPhonetic = ri( "store.emailPhonetic" );
        const intentResponse = ri( "refund.intent.response", {storeEmailPhonetic: emailPhonetic} );

        const locale                    = handlerInput.requestEnvelope.request.locale;

        return handlerInput.jrb
                            .speak( intentResponse )
                            .withStandardCard( cardTitle, cardContent, config.REGIONAL[locale].storeLogoURL )
                            .withShouldEndSession( true )
                            .getResponse( );
    }
};

// CERTIFICATION REQUIREMENT
// Tell the customer how they can cancel an order
const CancelOrderIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
               handlerInput.requestEnvelope.request.intent.name === 'CancelOrderIntent';
    },
    handle( handlerInput ) {

        const cardTitle = ri( "cancel.card.title" );
        const email = ri( "store.email" );
        const phone = ri( "store.phone" );
        const cardContent = ri( "cancel.card.content", {storePhoneNumber: phone, storeEmail: email} );

        const emailPhonetic = ri( "store.emailPhonetic" );
        const intentResponse = ri( "cancel.intent.response", {storeEmailPhonetic: emailPhonetic} );

        const locale                    = handlerInput.requestEnvelope.request.locale;

        return handlerInput.jrb
                            .speak( intentResponse )
                            .withStandardCard( cardTitle, cardContent, config.REGIONAL[locale].storeLogoURL )
                            .withShouldEndSession( true )
                            .getResponse( );
    }
};

// Help the customer
const HelpIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type        === 'IntentRequest' && 
               handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle( handlerInput ) {
        return handlerInput.jrb
                            .speak( ri( "help.response" ) )
                            .withShouldEndSession( false )
                            .getResponse( );
    }
};

// Where is my order? Send customer their tracking information and status
const OrderTrackerIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type        === 'IntentRequest' &&
               handlerInput.requestEnvelope.request.intent.name === 'OrderTrackerIntent';
    },
    handle( handlerInput ) {
        const locale                    = handlerInput.requestEnvelope.request.locale;
        // Implement your code here to query the respective shipping service API's. This demo simply returns a static message.
        return handlerInput.jrb
                            .speak( ri( "orderTracking.intent.response" ) )
                            .withStandardCard( ri( "orderTracking.card.title" ), ri( "orderTracking.card.content" ), config.REGIONAL[locale].storeLogoURL)
                            .withShouldEndSession( false )
                            .getResponse( );
    }
};

// I want to exit the skill
const ExitSkillIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type        === 'IntentRequest' && (
               handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
               handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent');
    },
    handle( handlerInput ) {
        return handlerInput.jrb
                            .speak( ri( "exitSkill" ) )
                            .withShouldEndSession( true )
                            .getResponse( );
    }
};

// End session
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        return handlerInput.jrb
                            .speak( ri( "exitSkill" ) )
                            .withShouldEndSession( true )
                            .getResponse();
    },
};

// Fallback handler
const FallbackIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type        === 'IntentRequest' && 
               handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle( handlerInput ) {
        const helpMessage = ri( "help.response" );
        const fallbackMessage = ri( "fallback.response", {helpMessage: helpMessage} );
        return handlerInput.jrb
                            .speak( fallbackMessage )
                            .withShouldEndSession( false )
                            .getResponse( );
}
};

// Generic error handling
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const debug = true;
        const stack = error.stack.split('\n');
        console.log(stack[0]);
        console.log(stack[1]);

        let errorLoc = stack[1].substring(stack[1].lastIndexOf('/') + 1, 900);

        errorLoc = errorLoc.slice(0, -1);

        const file = errorLoc.substring(0, errorLoc.indexOf(':'));
        let line = errorLoc.substring(errorLoc.indexOf(':') + 1, 900);
        line = line.substring(0, line.indexOf(':'));

        let speechOutput = 'Sorry, an error occurred. ';
        if(debug) {
            speechOutput +=  error.message + ' in ' + file + ', line ' + line;
        }

        console.log("ERROR: " + speechOutput);

        return handlerInput.jrb
            .speak(speechOutput)
            .reprompt(speechOutput)
            .getResponse();
    },
};

// This request interceptor with each new session loads all global persistent attributes
// into the session attributes and increments a launch counter
const PersistenceRequestInterceptor = {
    process( handlerInput ) {
        if ( handlerInput.requestEnvelope.session[ 'new' ] ) {
            return new Promise( ( resolve, reject ) => {
                handlerInput.attributesManager.getPersistentAttributes( )
                            .then( ( persistentAttributes ) => {
                                persistentAttributes = persistentAttributes || {};

                                if ( !persistentAttributes.launchCount )
                                    persistentAttributes.launchCount = 0;
                                    persistentAttributes.launchCount += 1;
                                    handlerInput.attributesManager.setSessionAttributes( persistentAttributes );
                                    resolve( );
                                } )
                            .catch( ( err ) => {
                                reject( err );
                            } );
            } );
        }
    }
};

// This response interceptor stores all session attributes into global persistent attributes
// when the session ends and it stores the skill last used timestamp
const PersistenceResponseInterceptor = {
    process( handlerInput, responseOutput ) {
        const ses = ( typeof responseOutput.shouldEndSession === 'undefined' ? true : responseOutput.shouldEndSession );

        if ( ses || handlerInput.requestEnvelope.request.type === 'SessionEndedRequest' ) { // skill was stopped or timed out 
            let sessionAttributes = handlerInput.attributesManager.getSessionAttributes( );

            sessionAttributes.lastUseTimestamp = new Date( handlerInput.requestEnvelope.request.timestamp ).getTime( );
            handlerInput.attributesManager.setPersistentAttributes( sessionAttributes );

            return new Promise( ( resolve, reject ) => {
                handlerInput.attributesManager.savePersistentAttributes( )
                                                .then( ( ) => {
                                                    resolve( );
                                                } )
                                                .catch( ( err ) => {
                                                    reject( err );
                                                } );
            } );
        }
    }
};


// Customer has shown intent to purchase, call Setup to grab the customers shipping address details
function amazonPaySetup ( handlerInput, productType ) {

    // Save session attributes because skill connection directives will close the session
    const { attributesManager }     = handlerInput;
    let attributes                  = attributesManager.getSessionAttributes( );

    attributes.productType          = productType;
    attributesManager.setSessionAttributes( attributes );
    
    //Permission check
    console.log("starting permission check");
    utilities.handleMissingPermission( handlerInput, config.GENERAL.scope );

    // If you have a valid billing agreement from a previous session, skip the Setup action and call the Charge action instead
    const token                     = utilities.generateRandomString( 12 );

    // If you do not have a billing agreement, set the Setup payload and send the request directive
    const setupPayload              = payloadBuilder.setupPayload( handlerInput.requestEnvelope.request.locale );
    const setupRequestDirective     = directiveBuilder.createSetupDirective( setupPayload, token );

    
    return handlerInput.jrb
                        .addDirective( setupRequestDirective )
                        .withShouldEndSession( true )
                        .getResponse( ); 

}

// Customer has requested checkout and wants to be charged
function amazonPayCharge ( handlerInput ) {

    // Permission check
    utilities.handleMissingPermission( handlerInput, config.GENERAL.scope );
    const permissions           = handlerInput.requestEnvelope.context.System.user.permissions;
    const amazonPayPermission   = permissions.scopes[ config.GENERAL.scope ];

    if ( amazonPayPermission.status === 'DENIED' ) {
        return handlerInput.jrb
                            .speak( ri( 'enablePermission' ) )
                            .withAskForPermissionsConsentCard( [ config.GENERAL.scope ] )
                            .getResponse();
    }    

    // Get session attributes
    const { attributesManager }     = handlerInput;
    let attributes                  = attributesManager.getSessionAttributes( );
    const billingAgreementId        = attributes.billingAgreementId;
    const authorizationReferenceId  = utilities.generateRandomString( 16 );
    const sellerOrderId             = utilities.generateRandomString( 6 );
    const locale                    = handlerInput.requestEnvelope.request.locale;
    const token                     = utilities.generateRandomString( 12 );    
    const amount                    = config.REGIONAL[locale].amount;
    
    // Set the Charge payload and send the request directive
    const chargePayload             = payloadBuilder.chargePayload(billingAgreementId, authorizationReferenceId, sellerOrderId, amount, locale);
    const chargeRequestDirective    = directiveBuilder.createChargeDirective(chargePayload, token);

    return handlerInput.jrb
                        .addDirective( chargeRequestDirective )
                        .withShouldEndSession( true )
                        .getResponse( );
}

const skillBuilder = new Jargon.JargonSkillBuilder({mergeSpeakAndReprompt : true}).installOnto(Alexa.SkillBuilders.custom());
exports.handler = skillBuilder
						.addRequestHandlers(
							LaunchRequestHandler,
                            InProgressStarterKitIntent,
                            CompletedRefillIntentHandler,
                            YesIntentHandler,
                            NoIntentHandler,
                            SetupConnectionsResponseHandler,
                            ChargeConnectionsResponseHandler,
                            RefundOrderIntentHandler,
                            CancelOrderIntentHandler,
                            HelpIntentHandler,
                            OrderTrackerIntentHandler,
                            ExitSkillIntentHandler,
                            SessionEndedRequestHandler,
                            FallbackIntentHandler
                             )
                        .addRequestInterceptors( PersistenceRequestInterceptor )
                        .addResponseInterceptors( PersistenceResponseInterceptor )                        
                        .withPersistenceAdapter( persistence = new s3Adapter( 
                            { bucketName: config.GENERAL.bucketName } ))
                        .addErrorHandlers(
                            ErrorHandler )
						.lambda( );