/**
 * @author Benjamin Berman
 * © 2014 All Rights Reserved
 **/
Accounts.onCreateUser(function (options, user) {
    user.hasSeenTutorial = false;
    return user;
});