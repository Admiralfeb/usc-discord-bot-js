import {
  ApplicationCommandOption,
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from 'discord.js';
import { inara_token } from '../config';
import { BotCommand } from '../models/botCommand';
import axios from 'axios';
import { InaraCMDR } from '../models/inaraCMDR';
import ranks from '../data/ranks';

const name = 'cmdr';
const description = 'Get your Cmdr data';
const options: ApplicationCommandOption[] = [
  {
    name: 'cmdr',
    description: 'CMDR name',
    type: 'STRING',
    required: true,
  },
];
const execute = async (interaction: CommandInteraction): Promise<void> => {
  const currentTime = new Date().toISOString();
  const cmdr = interaction.options.getString('cmdr', true);

  const request_header = {
    appName: 'USC Bot',
    appVersion: '1.0.0',
    isBeingDeveloped: true,
    APIkey: inara_token,
  };

  const request_event = {
    eventName: 'getCommanderProfile',
    eventTimestamp: currentTime,
    eventData: {
      searchName: cmdr,
    },
  };

  const data = { header: request_header, events: [request_event] };
  const response = await (
    await axios.get('https://inara.cz/inapi/v1/', { data })
  ).data;

  const event: {
    eventStatus: number;
    eventStatusText?: string;
    eventData: unknown;
  } = response.events[0];

  console.log(event.eventData);

  if (event.eventStatus === 204) {
    await interaction.reply('No inara profiles were found');
    return;
  }
  if (event.eventStatus === 400) {
    await interaction.reply('There was an error executing that command');
    return;
  }

  const cmdrData = event.eventData as InaraCMDR;
  const cmdrRanks = cmdrData.commanderRanksPilot;

  const components = new MessageActionRow();

  const embed = new MessageEmbed()
    .setTitle('Inara Profile')
    .setURL(cmdrData.inaraURL)
    .setDescription(cmdrData.preferredGameRole ?? 'N/A')
    .setAuthor(
      cmdrData.commanderName ?? cmdrData.userName,
      cmdrData.avatarImageURL,
      cmdrData.inaraURL
    );
  if (cmdrData.avatarImageURL) embed.setThumbnail(cmdrData.avatarImageURL);

  components.addComponents([
    new MessageButton()
      .setStyle('LINK')
      .setLabel('Inara Profile')
      .setURL(cmdrData.inaraURL),
  ]);

  for (const rank of cmdrRanks) {
    const rankName = rank.rankName;
    const rankValue: number = parseInt(rank.rankValue);
    const rankSet = ranks.find(
      (x) => x.name === rankName || x.inaraName === rankName
    );
    const currentRank = rankSet?.ranks[rankValue];
    const rankProgress =
      currentRank === 'Elite V' ||
      currentRank === 'King' ||
      currentRank === 'Admiral'
        ? ''
        : `- ${rank.rankProgress * 100}%`;
    if (rankSet) {
      const rankDisplayName =
        rankSet.name === 'cqc'
          ? 'CQC'
          : rankSet?.name[0].toUpperCase() + rankSet?.name.slice(1);
      embed.addField(rankDisplayName, `${currentRank} ${rankProgress}`, true);
    }
  }

  if (cmdrData.commanderSquadron) {
    embed.addField('Squadron', cmdrData.commanderSquadron.squadronName);
    components.addComponents([
      new MessageButton()
        .setStyle('LINK')
        .setLabel(cmdrData.commanderSquadron.squadronName)
        .setURL(cmdrData.commanderSquadron.inaraURL),
    ]);
  }

  embed.setFooter(
    `Retrieved from Inara at the behest of ${interaction.user.tag}`
  );

  if (cmdrData.otherNamesFound) {
    const othersFoundEmbed = new MessageEmbed().setTitle(
      'Other CMDRs Found for that name.'
    );
    for (const otherName of cmdrData.otherNamesFound) {
      othersFoundEmbed.addField('-', otherName, true);
    }
    await interaction.reply({
      embeds: [othersFoundEmbed, embed],
      components: [components],
    });
  } else {
    await interaction.reply({ embeds: [embed], components: [components] });
  }
};

export const command: BotCommand = { name, description, options, execute };
export default command;
