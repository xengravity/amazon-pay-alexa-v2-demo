/**
    This skill is built for Nodejs using Alexa ASK V2.0.3 
    Download the SDK here: https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/wiki/Setting-Up-The-ASK-SDK

    TODO: 
            + Pull refill subscription logic to starter kit dialog
            + Clean up hard coded strings in connections
            + Is it possible to move from directive to intent w/o user invocation?
            + Add dynamic username in config for 'Drew'
            + Clean up YesIntent logic for checkout
            + Remove all console logs
**/

'use strict';

const askSDK            = require( 'ask-sdk-core' );
const config            = require( 'config' );
const directiveBuilder  = require( 'directive-builder' );
const payloadBuilder    = require( 'payload-builder' );
const error             = require( 'error-handler' );
const utilities         = require( 'utilities' );
const s3Adapter         = require( 'ask-sdk-s3-persistence-adapter' ).S3PersistenceAdapter;
const products          = Object.freeze( {
                                KIT:     'kit',
                                UPGRADE: 'upgrade',
                                REFILL:  'refill'
                            } );
let persistence         = '';

// Welcome, are you interested in a starter kit or a refill subscription?
const LaunchRequestHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle( handlerInput ) {
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        return handlerInput.responseBuilder
                            .speak( config.launchRequestWelcomeResponse + ' ' + config.launchRequestQuestionResponse )
                            .withStandardCard( config.launchRequestWelcomeTitle, config.storeURL, config.logoURL )
				            .reprompt( config.launchRequestQuestionResponse )
                            .withShouldEndSession( false )
				            .getResponse( );
    }
};

// Purchase a starter kit, upgrade the starter kit, or exit?
const InProgressStarterKitIntent = {
    canHandle( handlerInput ) {
        const request = handlerInput.requestEnvelope.request;

        return request.type         === 'IntentRequest' &&
               request.intent.name  === 'StarterKitIntent' &&
               request.dialogState  !== 'COMPLETED';
    },
    handle( handlerInput ) {
        console.log(`Intent input: ${ JSON.stringify( handlerInput ) }`);
        const currentIntent = handlerInput.requestEnvelope.request.intent;

        for ( const slotName of Object.keys( handlerInput.requestEnvelope.request.intent.slots ) ) {
            const currentSlot = currentIntent.slots[ slotName ];

            if ( currentSlot.confirmationStatus !== 'CONFIRMED' && currentSlot.resolutions && currentSlot.resolutions.resolutionsPerAuthority[ 0 ] ) {
                if ( currentSlot.resolutions.resolutionsPerAuthority[ 0 ].status.code === 'ER_SUCCESS_MATCH' ) {
                    const currentSlotValue = currentSlot.resolutions.resolutionsPerAuthority[ 0 ].values[ 0 ].value.name;                  
                    
                    // No, I do not want to buy anything; exit the skill
                    if ( currentSlot.name === 'KitPurchaseIntentSlot' && currentSlotValue === 'no' ) {
                        // re-engage for different product
                        const { attributesManager }     = handlerInput;
                        let attributes                  = attributesManager.getSessionAttributes( );

                        attributes.reengage             = true;
                        attributesManager.setSessionAttributes( attributes );  

                        return handlerInput.responseBuilder
                            .speak( config.noIntentResponse )
                            .withShouldEndSession( false )
                            .getResponse( );
                    }

                    // No, I do not want to upgrade, just buy the starter kit
                    if ( currentSlot.name === 'UpgradeKitIntentSlot' && currentSlotValue === 'no' ) {
                        return AmazonPaySetup( handlerInput, products.KIT );
                    }

                    // Yes, I do want to upgrade the starter kit
                    if ( currentSlot.name === 'UpgradeKitIntentSlot' && currentSlotValue === 'yes' ) {
                        return AmazonPaySetup( handlerInput, products.UPGRADE );                  
                    }

                    // TODO: Pull refill subscription logic here                                 
                } else {
                    console.log(`had no match for products`);
                }
            } 
        }

        return handlerInput.responseBuilder
                            .addDelegateDirective( currentIntent )
                            .getResponse( );
    }
};

// Consumer has shown intent to purchase, call Setup to grab the consumers shipping address details
function AmazonPaySetup ( handlerInput, productType ) {

    // Save session attributes because directives will close the session
    const { attributesManager }     = handlerInput;
    let attributes                  = attributesManager.getSessionAttributes( );

    attributes.productType          = productType;
    attributesManager.setSessionAttributes( attributes );
    
    // Permission check
    utilities.getPermissionStatus( handlerInput );

    // If you have a valid billing agreement from a previous session, skip the Setup action and call the Charge action instead
    const token                     = utilities.generateRandomString( 12 );

    // If you do not have a billing agreement, set the Setup payload and send the request directive
    const setupPayload              = payloadBuilder.setupPayload(handlerInput.requestEnvelope.request.locale);
    const setupRequestDirective     =  directiveBuilder.createSetupDirective(setupPayload, token);

    return handlerInput.responseBuilder
                        .addDirective( setupRequestDirective )
                        .withShouldEndSession( true )
                        .getResponse( ); 
}

// Consumer has requested checkout and wants to be charged
function AmazonPayCharge ( handlerInput ) {

    // Permission check
    utilities.getPermissionStatus( handlerInput );

    // Get session attributes
    const { attributesManager }     = handlerInput;
    let attributes                  = attributesManager.getSessionAttributes( );
    const billingAgreementId        = attributes.billingAgreementId;
    const authorizationReferenceId  = utilities.generateRandomString(16);
    const sellerOrderId             = utilities.generateRandomString(6);
    const locale                    = handlerInput.requestEnvelope.request.locale;
    const token                     = utilities.generateRandomString( 12 );    
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
function GetResponse ( stage, template, productType, shippingAddress ) {

    let productPrice                = '';
    let subscriptionPrice           = '';
    let cartSummaryResponse         = template;
    let cartSummarySubscription     = config.cartSummarySubscription;
    let confirmationCardResponse    = template;
    let confirmationItem            = '';      

    console.log(productType + ' vs ' + products.KIT);

    switch ( productType ) {
        case products.KIT:
            productType             = 'Starter Kit';
            confirmationItem        = 'Starter Kit';
            productPrice            = 9;
            cartSummarySubscription = '';
            break;

        case products.REFILL:
            confirmationItem        = 'Refill Subscription';   
            productPrice            = 20;
            subscriptionPrice       = 20;
            cartSummarySubscription = cartSummarySubscription.replace( '{subscriptionPrice}', subscriptionPrice );
            break;

        case products.UPGRADE:
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

// I want to buy a refill subscription
// TODO: Add to StarterKitIntent Dialog instead of separate intent
const CompletedRefillIntentHandler = {
    canHandle( handlerInput ) {
        const request = handlerInput.requestEnvelope.request;

        return request.type         === 'IntentRequest' && 
               request.intent.name  === 'RefillIntent' && 
               request.dialogState  === 'COMPLETED';
    },
    handle( handlerInput ) {
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        const filledSlots           = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues            = utilities.getSlotValues( filledSlots );
        const yesNoResponse         = `${slotValues.RefillPurchaseIntentSlot.resolved}`;

        if ( yesNoResponse === 'no' ){
            
            // try to re-engage the customer for different products
            const { attributesManager }     = handlerInput;
            let attributes                  = attributesManager.getSessionAttributes( );

            attributes.reengage             = true;
            attributesManager.setSessionAttributes( attributes );  
            
            // I don't want to buy anything, exit the skill
            return handlerInput.responseBuilder
                                .speak( config.noIntentResponse )
                                .withShouldEndSession( false )
                                .getResponse();
        } else {
            // Yes, I want to buy the refill subscription
            return AmazonPaySetup( handlerInput, products.REFILL );  
        }
    }
};

// I want to checkout and place my order
const YesIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type        === 'IntentRequest' &&
               handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
    },
    handle( handlerInput ) {
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        
        const { attributesManager }     = handlerInput;
        let attributes                  = attributesManager.getSessionAttributes( );             
        const setupHappened             = attributes.setup;

        if(attributes.reengage){
            attributes.reengage = false;
            attributesManager.setSessionAttributes( attributes );
            return handlerInput.responseBuilder
                .speak(config.launchRequestQuestionResponse)
                .reprompt(config.launchRequestQuestionResponse)
                .withShouldEndSession(false)
                .getResponse();  
        }
        // Did setup already happen?
        if ( setupHappened ) {
            // cleanup
            attributes.setup = false;
            attributesManager.setSessionAttributes( attributes );
            return AmazonPayCharge( handlerInput );    
        } else {
             return handlerInput.responseBuilder
                .speak( 'Check the yes intent handler' )
                .withShouldEndSession( false )
                .getResponse();           
        }  
    }
};



const NoIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type        === 'IntentRequest' &&
               handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
    },
    handle( handlerInput ) {
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        const { attributesManager }     = handlerInput;
        let attributes                  = attributesManager.getSessionAttributes( );       
        console.log(`Attributes: ${JSON.stringify(attributes)}`);      
        
        if(attributes.reengage){
            // cleanup
            attributes.reengage         = false;
            attributesManager.setSessionAttributes( attributes );
            console.log(`Attributes: ${JSON.stringify(attributes)}`);   
            // exit
            return ExitSkillIntentHandler.handle(handlerInput);
        }  
        if(attributes.setup){
            // customer decided to not checkout, while having filled the cart already
            attributes.reengage         = true;
            // todo: should setup akso be set to false?
            // todo: maybe replace setup, reengage,  ... with 'STATES' of a state machine?
            attributesManager.setSessionAttributes( attributes );  

            return handlerInput.responseBuilder
                .speak( config.noIntentResponse )
                .withShouldEndSession( false )
                .getResponse( );
        }
        // catching unexpected no's
        return FallbackIntentHandler.handle(handlerInput);
    }
};

// You requested the Setup directive and are now receiving the Connections.Response
const SetupConnectionsResponseHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
        handlerInput.requestEnvelope.request.name === directiveBuilder.setupDirectiveName;
    },
    handle( handlerInput ) {
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        const connectionResponsePayload       	    = handlerInput.requestEnvelope.request.payload;
        const connectionResponseStatusCode    	    = handlerInput.requestEnvelope.request.status.code;

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
            console.log(`Attributes after setup: ${JSON.stringify(attributes)}`);

            const shippingAddress           = connectionResponsePayload.billingAgreementDetails.destination.addressLine1;
            let productType                 = attributes.productType;
            let cartSummaryResponse         = GetResponse( 'summary', config.cartSummaryResponse, productType, shippingAddress );

            return handlerInput.responseBuilder
                .speak( cartSummaryResponse )
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
        return handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
                handlerInput.requestEnvelope.request.name === directiveBuilder.chargeDirectiveName;
    },
    handle( handlerInput ) {
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
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
            let confirmationCardResponse    = GetResponse( 'confirmation', config.confirmationCardResponse, productType, null );

            return handlerInput.responseBuilder
                                .speak( config.confirmationIntentResponse )
                                .withStandardCard( config.confirmationTitle, confirmationCardResponse, config.logoURL )
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
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        return handlerInput.responseBuilder
                            .speak( config.refundOrderIntentResponse )
                            .withStandardCard( config.refundOrderTitle, config.refundOrderCardResponse, config.logoURL )
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
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        return handlerInput.responseBuilder
                            .speak( config.cancelOrderIntentResponse )
                            .withStandardCard( config.cancelOrderTitle, config.cancelOrderCardResponse, config.logoURL )
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
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        return handlerInput.responseBuilder
                            .speak( config.helpCommandsIntentResponse )
                            .withShouldEndSession( false )
                            .getResponse( );
    }
};

const FallbackIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type        === 'IntentRequest' && 
               handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle( handlerInput ) {
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        return handlerInput.responseBuilder
                            .speak( config.fallbackHelpMessage )
                            .withShouldEndSession( false )
                            .getResponse( );
    }
};

// Where is my order?
const OrderTrackerIntentHandler = {
    canHandle( handlerInput ) {
        return handlerInput.requestEnvelope.request.type        === 'IntentRequest' &&
               handlerInput.requestEnvelope.request.intent.name === 'OrderTrackerIntent';
    },
    handle( handlerInput ) {
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        // Implement your code here to query the respective shipping service API's. This demo simply returns a static message.
        return handlerInput.responseBuilder
                            .speak( config.orderTrackerIntentResponse )
                            .withStandardCard( config.orderTrackerTitle, config.orderTrackerCardResponse, config.logoURL )
                            .withShouldEndSession( true )
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
        console.log(`Exiting skill: ${JSON.stringify(handlerInput)}`);
        return handlerInput.responseBuilder
                            // TODO: Get official response from UX
                            .speak( 'see ya later!' )
                            .withShouldEndSession( true )
                            .getResponse( );
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

        // TODO: possibly a good spot to cleanup session state. Caution, only on unexpected reasons, not always, otherwise we cannot make use of picking up a session again

        return handlerInput.responseBuilder
            .speak('bye')
            .withShouldEndSession(true)
            .getResponse();
    },
};

// Generic error handling
const ErrorHandler = {
    canHandle( ) {
        return true;
    },
    handle( handlerInput, error ) {
        console.log( `Log from ErrorHandler: ${ error.message }` );
        console.log(`Intent input: ${JSON.stringify(handlerInput)}`);
        const speechText = config.errorUnknown + ' ' + error.message;

        return handlerInput.responseBuilder
            .speak( speechText )
            .reprompt( speechText )
            .getResponse();
    }
};

// This request interceptor with each new session loads all global persistent attributes
// into the session attributes and increments a launch counter
// original code @ https://gist.github.com/germanviscuso/70c979f671660fea811ccfb63801f936
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
        } // end session['new'] 
    }
};

// This response interceptor stores all session attributes into global persistent attributes
// when the session ends and it stores the skill last used timestamp
// original code @ https://gist.github.com/germanviscuso/70c979f671660fea811ccfb63801f936
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

exports.handler = askSDK.SkillBuilders
						.custom( )
						.addRequestHandlers(
							LaunchRequestHandler,
                            InProgressStarterKitIntent,
                            CompletedRefillIntentHandler,
                            YesIntentHandler, 
                            ChargeConnectionsResponseHandler,
                            SetupConnectionsResponseHandler,
                            RefundOrderIntentHandler,
                            CancelOrderIntentHandler,
                            HelpIntentHandler,
                            OrderTrackerIntentHandler,
                            ExitSkillIntentHandler,
                            SessionEndedRequestHandler,
                            FallbackIntentHandler,
                            NoIntentHandler)
                        .addRequestInterceptors( PersistenceRequestInterceptor )
                        .addResponseInterceptors( PersistenceResponseInterceptor )                        
                        .withPersistenceAdapter( persistence = new s3Adapter( 
                            { bucketName: config.GENERAL.bucketName } ))
                        .addErrorHandlers(
                            ErrorHandler )
						.lambda( );