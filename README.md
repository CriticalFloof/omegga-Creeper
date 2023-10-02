<!--

When uploading your plugin to github/gitlab
start your repo name with "omegga-"

example: https://github.com/CriticalFloof/omegga-Creeper

Your plugin will be installed via omegga install gh:CriticalFloof/Creeper

-->

# Creeper

A Strategic Gamemode for Brickadia powered by [omegga](https://github.com/brickadia-community/omegga).

## Objective

Players are spawned into a map where self replicating bricks, called Creeper, attempt to spread across the map and destroy all players.

The players are tasked with the goal of surviving the timer, or eradicating the creeper.

## Installation

1. Type `omegga install gh:CriticalFloof/Creeper` into the terminal.

..and That's it!

## Plugin Modes

### Playing

The plugin is configured for immediate play.

Upon start, a map vote lasting 15 seconds will occur, most popular map will be chosen and that map will be played for the configured amount of time.
(TODO: insert screenshot of plugin config showing this.)

### Map Editor

This plugin also has in-game support for map creation.

This can be toggled immediately, in-game by first stopping the game with `/toggle_game` and enabling the map editor with `/toggle_map_edit`
You can also switch edit mode on from the config panel inside the Omegga Web UI. (Remember to wait for the config to save before reloading.)
(TODO: insert another screenshot of plugin config showing this.)

## Map Creation

This will be a walkthrough on how to create a map from scratch.

1. Make sure the map editor is enabled.
2. Type `/create_map` inside the game chat.
   2a. The plugin will ask which gamemode to use, since there's only one gamemode, respond with `/respond creeper`
   2b. Then you will be asked what name to give the map. respond with `/respond (name)` where (name) is your map's name.
   2c. The map is now created and contains a placeholder build and environment.
3. Build your map and set the preferred environment, use `/save_map (name)` to save the map.
   3a. If you need to load the map again, use `/load_map (name)`
   3b. It's advised to keep map appearance simple, and to avoid using too much special, or ramp bricks in the play area.
4. Place creeper spawns using bricks with an interact component attached to it, that shows the message "creeper_spawn" when clicked.
   4a. Make sure that all creeper spawns are the SAME SIZE and are ALIGNED to eachother.
5. Save and Compile the map with `/build_map (name)` (Or only compile the map with `/compile_map (name)`)
   5a. Bigger maps will take much more time to compile and load during play, so avoid letting your bricks take up unnessesary space.
6. Thats it, If your map compiled correctly, you should be able to start the game and the map will appear in the map rotation automatically!
