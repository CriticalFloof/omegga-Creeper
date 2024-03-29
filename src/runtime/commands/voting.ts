import Command, { TrustLevel } from "src/lib/commands";
import { VotingHandler } from "src/lib/game_loop/voting";
import { Runtime } from "../main";
import GameController from "src/lib/game_loop/game_initialization/game_control";

new Command("vote", TrustLevel.Default, (speaker: string, voteNumberStr: string) => {
    if (!GameController.isEnabled()) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> The game is not running.`);
        return;
    }
    if (VotingHandler.getVotingChoices().length === 0) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> There is no ongoing vote.`);
        return;
    }
    if (!voteNumberStr) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please provide a number.`);
        return;
    }
    const voteNumber = parseInt(voteNumberStr);
    if (!Number.isInteger(voteNumber)) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> ${voteNumber} is not a number.`);
        return;
    }
    VotingHandler.castVote(speaker, voteNumber - 1)
        .then(() => {
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> You voted for ${voteNumber}.`);
        })
        .catch((err: Error) => {
            if (err.message === "out_of_range") {
                Runtime.omegga.whisper(
                    speaker,
                    `<size="10"><color="00FFFF">\></></> Pick a number between 1 and ${VotingHandler.getVotingChoices().length}.`
                );
                return;
            }
        });
});
