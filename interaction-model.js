/**
    1. interaction-model.js is not meant to be used as part of this code base
    2. This is only included to jump start the skill creation process during the demo
    3. Edit the value for invocationName to match your invocation name in the skill
    4. In developer portal under your skill, use the JSON editor to add the object below
    

    DO NOT COPY THIS COMMENT WHEN YOU PASTE THE OBJECT BELOW INTO THE JSON EDITOR
**/


{
    "interactionModel": {
        "languageModel": {
            "invocationName": "no nicks",
            "intents": [
                {
                    "name": "AMAZON.HelpIntent",
                    "samples": [
                        "help"
                    ]
                },
                {
                    "name": "RefundOrderIntent",
                    "slots": [],
                    "samples": [
                        "refund",
                        "refund order",
                        "refund my order",
                        "i'd like my order refunded",
                        "i'd like a refund",
                        "i need a refund",
                        "refund the order",
                        "please give me a refund",
                        "give me a refund",
                        "i would like a refund"
                    ]
                },
                {
                    "name": "CancelOrderIntent",
                    "slots": [],
                    "samples": [
                        "cancellation",
                        "cancel order",
                        "cancel my order",
                        "cancel the order",
                        "cancel that order",
                        "i need to cancel the order",
                        "i would like to cancel my order",
                        "cancel order please"
                    ]
                },
                {
                    "name": "CheckoutIntent",
                    "slots": [],
                    "samples": [
                        "place my order",
                        "place order",
                        "checkout",
                        "i want to checkout",
                        "buy",
                        "buy now",
                        "checkout please",
                        "complete order"
                    ]
                },
                {
                    "name": "OrderTrackerIntent",
                    "slots": [],
                    "samples": [
                        "did my order ship",
                        "when will my item ship",
                        "where's my order",
                        "where is my order"
                    ]
                },
                {
                    "name": "StarterKitIntent",
                    "slots": [
                        {
                            "name": "KitPurchaseIntentSlot",
                            "type": "YesNoType",
                            "samples": [
                                "no",
                                "yes"
                            ]
                        },
                        {
                            "name": "UpgradeKitIntentSlot",
                            "type": "YesNoType",
                            "samples": [
                                "no",
                                "yes"
                            ]
                        }
                    ],
                    "samples": [
                        "order",
                        "a kit",
                        "starter kit",
                        "kit",
                        "I need a razor",
                        "the starter kit",
                        "get a kit",
                        "get a starter kit",
                        "I want a starter kit",
                        "I want a kit",
                        "I want to order a kit",
                        "I want to order a starter kit",
                        "a starter kit"
                    ]
                },
                {
                    "name": "RefillIntent",
                    "slots": [
                        {
                            "name": "RefillPurchaseIntentSlot",
                            "type": "YesNoType"
                        }
                    ],
                    "samples": [
                        "{RefillPurchaseIntentSlot} more refills",
                        "more refills",
                        "refills",
                        "replacements",
                        "blade refills",
                        "shaving cream",
                        "schedule refills",
                        "get refills",
                        "refill",
                        "I want refills",
                        "I want to order refills"
                    ]
                },
                {
                    "name": "AMAZON.NavigateHomeIntent",
                    "samples": []
                },
                {
                    "name": "ExitSkillIntent",
                    "slots": [],
                    "samples": [
                        "cancel",
                        "stop",
                        "exit",
                        "quit",
                        "close"
                    ]
                },
                {
                    "name": "AMAZON.YesIntent",
                    "samples": [
                        "sure",
                        "ok",
                        "yup",
                        "yes"
                    ]
                },
                {
                    "name": "AMAZON.StopIntent",
                    "samples": []
                },
                {
                    "name": "AMAZON.CancelIntent",
                    "samples": []
                }
            ],
            "types": [
                {
                    "name": "YesNoType",
                    "values": [
                        {
                            "name": {
                                "value": "no",
                                "synonyms": [
                                    "naw",
                                    "nope"
                                ]
                            }
                        },
                        {
                            "name": {
                                "value": "yes",
                                "synonyms": [
                                    "right",
                                    "ok",
                                    "yup",
                                    "sure"
                                ]
                            }
                        }
                    ]
                }
            ]
        },
        "dialog": {
            "intents": [
                {
                    "name": "StarterKitIntent",
                    "confirmationRequired": false,
                    "prompts": {},
                    "slots": [
                        {
                            "name": "KitPurchaseIntentSlot",
                            "type": "YesNoType",
                            "confirmationRequired": false,
                            "elicitationRequired": true,
                            "prompts": {
                                "elicitation": "Elicit.Slot.295132847200.649643899751"
                            }
                        },
                        {
                            "name": "UpgradeKitIntentSlot",
                            "type": "YesNoType",
                            "confirmationRequired": false,
                            "elicitationRequired": true,
                            "prompts": {
                                "elicitation": "Elicit.Slot.81496166760.874607615560"
                            }
                        }
                    ]
                },
                {
                    "name": "RefillIntent",
                    "delegationStrategy": "ALWAYS",
                    "confirmationRequired": false,
                    "prompts": {},
                    "slots": [
                        {
                            "name": "RefillPurchaseIntentSlot",
                            "type": "YesNoType",
                            "confirmationRequired": false,
                            "elicitationRequired": true,
                            "prompts": {
                                "elicitation": "Elicit.Slot.477688339049.1345714957873"
                            }
                        }
                    ]
                }
            ],
            "delegationStrategy": "SKILL_RESPONSE"
        },
        "prompts": [
            {
                "id": "Elicit.Slot.639501222016.1000025700327",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "You can save ten percent today by signing up for refills. Every two months, you'll receive eight blades and a two ounce tube of shaving cream for eightteen dollars including shipping. Cancel or change delivery any time. Do you want to add this to your order?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.295132847200.649643899751",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "Our nine dollar starter kit comes with a weighted razor handle, three blades, and a two ounce tube of menthol shaving cream. Do you want to order it?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.295132847200.45782372218",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "You can save ten percent today by signing up for refills. Every two months, you'll receive eight blades and a two ounce tube of shaving cream for eightteen dollars including shipping. Cancel or change delivery any time. Do you want to add this to your order?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.122713613702.883585601394",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "You can save ten percent today by signing up for refills. Every two months, you'll receive eight blades and a two ounce tube of shaving cream for eighteen dollars including shipping. Cancel or change delivery any time. Do you want to add this to your order?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.227603226437.555791052698",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "Every two months, you'll receive a refill of eight blades and a two ounce tube of shaving cream for twenty dollars including shipping. Cancel or change delivery any time. Do you want to order now?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.477688339049.1345714957873",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "Every two months, you'll receive a refill of eight blades and a two ounce tube of shaving cream for twenty dollars including tax and shipping. You can cancel or change delivery any time. Do you want to check out now?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.1405619153703.871120215545",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "You can save ten percent today by signing up for refills. Every two months, you'll receive eight blades and a two ounce tube of shaving cream for eighteen dollars including shipping. Cancel or change delivery any time. Do you want to add this to your order?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.1432830506701.27798259708",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "You can save ten percent today by signing up for refills. Every two months, you'll receive eight blades and a two ounce tube of shaving cream for eighteen dollars including shipping. Cancel or change delivery any time. Do you want to add this to your order?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.871466476304.1051732784111",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "Do you want a dog?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.871466476304.473894939028",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "Do you want a car?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.81496166760.874607615560",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "You can save ten percent today by signing up for refills. Every two months, you'll receive eight blades and a two ounce tube of shaving cream for eighteen dollars including tax and shipping. You can cancel or change delivery any time. Do you want to add this to your order?"
                    }
                ]
            },
            {
                "id": "Elicit.Slot.350082470046.957699153803",
                "variations": [
                    {
                        "type": "PlainText",
                        "value": "dis dat upgrade doe"
                    }
                ]
            }
        ]
    }
}