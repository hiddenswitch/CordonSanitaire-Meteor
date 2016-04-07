/**
 * Created by jonathanbobrow on 4/6/16.
 */
/**
 * Business logic namespace for SMS
 * @type {{}}
 */
SanitaireTextMessage = {};

/**
 * Add an SMS number to a user for use with Twilio
 * @param number
 * @param userId
 * @param date
 */
SanitaireTextMessage.addSMSNumberForUser = function (number, userId, date) {
    // if nothing was entered, return null
    if(number === '') {
        return null;
    }

    var accountSid;
    var authToken;
    if (!_.isUndefined(Meteor.settings)
        && !_.isUndefined(Meteor.settings.private)
        && !_.isUndefined(Meteor.settings.private.twilio.account_sid)
        && !_.isUndefined(Meteor.settings.private.twilio.auth_token)) {
        accountSid = Meteor.settings.private.twilio.account_sid;
        authToken = Meteor.settings.private.twilio.auth_token;
    }

    var twilio = Twilio(accountSid, authToken);

    var LookupsClient = Twilio.LookupsClient;
    var client = new LookupsClient(accountSid, authToken);

    var validatedNumber = null;
    var syncGet = Meteor.wrapAsync(client.phoneNumbers(number).get);
    var result = syncGet({});
    validatedNumber = result.phoneNumber;

    if (validatedNumber === null) {
        // let user know
        return null;
    }
    else {
        var hourToText = (date.getHours() + 1) % 24;
        Meteor.users.update(userId, {
            $set: {
                sms: {
                    number: validatedNumber,
                    hourToText: hourToText
                }
            }
        });
    }

    return validatedNumber;
};

/**
 * Removes the number stored with this User
 * @param userId
 */
SanitaireTextMessage.removeSMSNumberForUser = function (userId) {
    Meteor.users.update(userId, {
        $set: {
            sms: null
        }
    });
};