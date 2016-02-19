#Cordon Sanitaire
## Description
Named for, and inspired by, the medieval practice of erecting barriers to prevent the spread of disease, Cordon Sanitaire is a collaborative, location-based mobile game in which players seek to isolate an infectious “patient zero” from the larger population. Every day, the game starts abruptly–synchronizing all players at once–and lasts for two minutes. In 60 seconds, players must choose either to help form the front line of a quarantine, or remain passive. Under pressure, the “uninfected” attempt to collaborate without communication, seeking to find the best solution for the group. When those 60 seconds end, a certain number of players are trapped inside with patient zero, and the score reflects the group’s ability to cooperate under duress.

## Setup
Recommended work environment is within JetBrains WebStorm, which provides quick navigation along with other useful features for working with this code base.

## Dependencies
1. [Meteor](https://www.meteor.com/)
2. [Phaser](http://phaser.io/)

## Architecture
The following will walk through the file structure and some code snippets to explain how to keep the app in working order as a multiplayer synchronous game.

Let's start with the most used files and what each of them contain.

1. **Main display**
  - **CordonSanitaire-Meteor.html** - templates for DOM, including main menu, lobby, game, profile...
  - **CordonSanitaire-Meteor.css** - styling for page templates
  - **CordonSanitaire-Meteor.js** - updates dynamic content in the templates (i.e. countdowns or stats)

2. **Game display**
  - **client/worldboard.html** - container for Phaser canvas
  - **client/worldboard.css** - styling for Phaser canvas (i.e. remove anti-aliasing)
  - **client/worldboard.js** - handles all aspects of drawing to the canvas, setup of Phaser and management of drawing game sprites, maps, states to the screen. In an MVC framework, this is View. Some level of control lies here, but you will see that much of the control should be elsewhere.

3. **Libraries**
  - **lib/collections.js** - the three collections in our database (Games, Players, Maps)
  - **lib/sanitaire.js** - 
  - **lib/patientzero.js** -

4. **Server**
  - **server/maps.js** - contains a list of possible map files on the server...
  - **server/accounts.js** - handle any logic about a user account such as having seen a tutorial 
  - **server/publishes.js** - 

5. **Meteor Settings**
  - **tests/settings/** - run meteor with one of these settings
```meteor --settings tests/settings/singleplayer.json```

6. Assets
  - **public/assets/** - assets for gameplay

##License

Copyright (c) 2015 MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
