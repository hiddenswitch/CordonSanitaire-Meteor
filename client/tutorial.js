/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
Template.tutorial.events({
    'click #finish': function () {
        Meteor.call('finishTutorial');
    }
});
