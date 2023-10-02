export default class CommandInitalizer {
    public static run() {
        require("./game_control");
        require("./map_file_manipulation");
        require("./defer_responses");
        require("./voting");
    }
}
