
import { after } from "@valenced/patcher";
import { lookupModule, lookupModuleWithImportedPath } from "@valenced/modules/finders";
import { withProps } from "@valenced/modules/finders/filters";
import { Stores } from "@valenced/discord/flux";
import { Design } from "@valenced/discord/design";
import { React, ReactNative } from "@valenced/react";
import { getAssetIdByName } from "@valenced/assets";
import { findInReactTree } from "@valenced/utils/tree";

type Settings = {
  chats: boolean;
  actionSheets: boolean;
  oldButton: boolean;
};

const defaults: Settings = {
  chats: true,
  actionSheets: true,
  oldButton: false,
};

const patched = Symbol.for("JumpToTopPatched");

function findModule(...props: string[]) {
  return lookupModule(withProps(...props))[0] as any;
}

function findPath(path: string) {
  return lookupModuleWithImportedPath(path)[0] as any;
}

function findActionGroups(tree: any) {
  return findInReactTree(
    tree,
    (node: any) =>
      node?.[0]?.props?.children?.find?.(
        (child: any) => child?.props?.label,
      ),
  );
}

function jumpTop(channelId?: string, guildId?: string) {
  if (!channelId) {
    const current = Stores.SelectedChannelStore.getChannelId();
    const channel = Stores.ChannelStore.getChannel(current);

    findModule("jumpToMessage").jumpToMessage({
      channelId: channel.id,
      messageId: channel.id,
      flash: true,
      jumpType: "ANIMATED",
    });
    return;
  }

  findModule("openUrl").openUrl(
    `https://discord.com/channels/${guildId ?? "@me"}/${channelId}/${channelId}`,
  );
}

function upsideDown(children: any) {
  return React.createElement(
    ReactNative.View,
    { style: { transform: [{ scaleY: -1 }] } },
    children,
  );
}

function jumpRow(onPress: () => void) {
  const Row = Design.ActionSheetRow;

  return React.createElement(
    Row.Group,
    null,
    React.createElement(Row, {
      label: "Jump To Top",
      icon: upsideDown(
        React.createElement(Row.Icon, {
          source: getAssetIdByName("ArrowLargeDownIcon"),
        }),
      ),
      onPress,
    }),
  );
}

function patchActionSheets(cleanup: (fn: () => void) => void, settings: Settings) {
  const forum = findPath(
    "modules/action_sheet/native/components/LongPressForumPostActionSheet.tsx",
  );

  const channelSheet = findPath(
    "modules/channel/native/ChannelLongPressActionSheet.tsx",
  );

  if (forum?.default) {
    cleanup(
      after(forum, "default", ([{ thread }]: any, ret: any) => {
        if (!settings.actionSheets || ret?.[patched]) return;

        const actions = findActionGroups(ret);
        if (!actions) return;

        actions.unshift(
          jumpRow(() => jumpTop(thread.id, thread.guild_id)),
        );
        ret[patched] = true;
      }),
    );
  }

  if (channelSheet?.default) {
    cleanup(
      after(channelSheet, "default", (_args: any, ret: any) => {
        if (!settings.actionSheets || ret?.[patched]) return;

        const channel = ret?.props?.channel;
        if (!channel) return;

        const allowed = [0, 1, 2, 3, 5, 6, 10, 11, 12];
        if (!allowed.includes(channel.type)) return;

        cleanup(
          after(ret, "type", (_args: any, component: any) => {
            const actions = findActionGroups(component);
            if (!actions) return;

            actions.unshift(
              jumpRow(() => jumpTop(channel.id, channel.guild_id)),
            );
          }),
        );

        ret[patched] = true;
      }),
    );
  }
}

function patchChatButton(cleanup: (fn: () => void) => void, settings: Settings) {
  const module = findPath(
    "components_native/chat/JumpToPresentButton.tsx",
  );

  const channelStore = Stores.ChannelStore;

  if (!module?.default) return;

  cleanup(
    after(module, "default", ([{ channelId }]: any, ret: any) => {
      if (!ret?.props || ret[patched]) return;

      const button = ret.props.children;
      const arrow = getAssetIdByName("ArrowLargeDownIcon");

      if (button?.props?.icon !== arrow) return;

      ret[patched] = true;

      const channel = channelStore.getChannel(channelId);
      const isVoice = channel?.type === 2;

      const jumpButton = upsideDown(
        React.cloneElement(button, {
          ...button.props,
          onPress: () => jumpTop(isVoice ? channelId : undefined, channel?.guild_id),
        }),
      );

      if (!settings.chats) return;

      ret.props.children = settings.oldButton
        ? React.createElement(
            Design.Stack,
            null,
            jumpButton,
            button,
          )
        : React.createElement(
            Design.Stack,
            null,
            jumpButton,
            button,
          );
    }),
  );
}

export default plugin({
  jsonStorage: {
    load: true,
    default: defaults,
  },

  start({ cleanup, jsonStorage }) {
    const settings = {
      ...defaults,
      ...jsonStorage.cache,
    };

    patchChatButton(cleanup, settings);
    patchActionSheets(cleanup, settings);

    console.log("[JumpToTop] Loaded");
  },

  stop() {
    console.log("[JumpToTop] Stopped");
  },

  SettingsComponent({ api }) {
    const settings = api.jsonStorage.use() ?? defaults;

    return React.createElement(
      Design.Stack,
      { style: { padding: 12 }, spacing: 16 },
      React.createElement(
        Design.TableRowGroup,
        { title: "JumpToTop Settings" },
        React.createElement(Design.TableSwitchRow, {
          label: "Add button to chats",
          subLabel: "Show Jump To Top above Jump To Present.",
          value: settings.chats,
          onValueChange: (value: boolean) =>
            api.jsonStorage.set({ chats: value }),
        }),
        React.createElement(Design.TableSwitchRow, {
          label: "Add button to action sheets",
          subLabel: "Add Jump To Top to channel and forum menus.",
          value: settings.actionSheets,
          onValueChange: (value: boolean) =>
            api.jsonStorage.set({ actionSheets: value }),
        }),
        React.createElement(Design.TableSwitchRow, {
          label: "Old button style",
          subLabel: "Use the old button appearance.",
          value: settings.oldButton,
          onValueChange: (value: boolean) =>
            api.jsonStorage.set({ oldButton: value }),
        }),
      ),
    );
  },
});
