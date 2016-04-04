/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
Template.tutorial.events({
    'click #nextButton': function () {
        // load the next image if available
        // update the UI to show correct buttons
    },
    'click #prevButton': function () {
        // load the previous image if available
        // update the UI to show correct buttons
    },
    'click #finish': function () {
        //Meteor.call('finishTutorial');
        Router.go('mainmenu');
    }
});
