# Prepare

Scripts expects https://github.com/Tyrrrz/DiscordChatExporter to be installed in the folder under `DiscordChatExporter` and `dotnet` CLI to be installed as well.

Read here how to obtain Discord's token: https://github.com/Tyrrrz/DiscordChatExporter/wiki/Obtaining-Token-and-Channel-IDs

## Get DM channel list

`dotnet ./DiscordChatExporter/DiscordChatExporter.Cli.dll dm -t "token" > ./input/channels_dm.txt`

## Get Server's channel list

`dotnet ./DiscordChatExporter/DiscordChatExporter.Cli.dll channels -t "token" -g "server_id" > ./input/channels.txt`

## Execute

Run `node export` to export data from your Discord Server (you will need to provide either `input/channels.txt` or channel ids to use)

Run `node convert` to prepare `output` dir (you will need to provide either `input/channels.txt` or channel ids to use)

Archive `output` and upload it to Slack Import Tool

## Disclaimer

This is not ready to use scripts, if you need help, please create issue or PR.
