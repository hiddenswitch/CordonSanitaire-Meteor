/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
var TUTORIAL_IMAGE_INDEX = 1;

Template.tutorial.onRendered(function () {
    // initialize the tutorial
    TUTORIAL_IMAGE_INDEX  = 1;
    // intialize buttons
    document.getElementById("nextButton").style.visibility = 'visible';
    document.getElementById("finishButton").style.visibility= 'hidden';
    document.getElementById("prevButton").style.visibility = 'hidden';
    // page number
    document.getElementById("tutorial-step-count").innerHTML = TUTORIAL_IMAGE_INDEX + " of 9";
});

Template.tutorial.events({
    'click #nextButton': function () {
        // load the next image if available
        if(TUTORIAL_IMAGE_INDEX < 9) {
            TUTORIAL_IMAGE_INDEX++;
            var path = "/assets/tutorial/Tutorial-0" + TUTORIAL_IMAGE_INDEX + ".jpg";
            document.getElementById("tutorial-image").src = path;
            document.getElementById("tutorial-step-count").innerHTML = TUTORIAL_IMAGE_INDEX + " of 9";
            document.getElementById("prevButton").style.visibility = 'visible';

            if( TUTORIAL_IMAGE_INDEX === 9) {
                // update the UI to show correct buttons
                document.getElementById("nextButton").style.visibility = 'hidden';
                document.getElementById("finishButton").style.visibility = 'visible';
            }
        }
    },
    'click #prevButton': function () {
        // load the previous image if available
        if(TUTORIAL_IMAGE_INDEX > 1) {
            TUTORIAL_IMAGE_INDEX--;
            var path = "/assets/tutorial/Tutorial-0" + TUTORIAL_IMAGE_INDEX + ".jpg";
            document.getElementById("tutorial-image").src = path;
            document.getElementById("tutorial-step-count").innerHTML = TUTORIAL_IMAGE_INDEX + " of 9";
            document.getElementById("nextButton").style.visibility = 'visible';
            document.getElementById("finishButton").style.visibility = 'hidden';

            if( TUTORIAL_IMAGE_INDEX === 1) {
                // update the UI to show correct buttons
                document.getElementById("prevButton").style.visibility = 'hidden';
            }
        }
    },
    'click #finishButton': function () {
        //Meteor.call('finishTutorial');
        Router.go('mainmenu');
    }
});
