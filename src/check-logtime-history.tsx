import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  Clipboard,
} from "@raycast/api";
import { useState } from "react";
import { useUser, useLocationStats } from "./hooks";
import { getTokenInfo } from "./lib/auth";
import { Preferences } from "./lib/types";
import { formatTime } from "./lib/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [queryText, setQueryText] = useState("");

  const preferences = getPreferenceValues<Preferences>();
  const debugMode = preferences.debugMode || false;

  // Fetch user data
  const {
    user,
    isLoading: isLoadingUser,
    error: userError,
    isAuthenticated,
    isAuthenticating,
    authenticate,
  } = useUser(queryText, {
    execute: queryText.length > 0,
  });

  // Fetch location stats (30 days back)
  const {
    stats,
    sortedDates,
    totalTime,
    isLoading: isLoadingStats,
    error: statsError,
  } = useLocationStats(user?.id, {
    daysBack: 30,
    execute: !!user?.id,
  });

  // Log errors in debug mode
  if (debugMode && (userError || statsError)) {
    console.error("API Error:", userError || statsError);
  }

  function handleSearch(text: string) {
    setSearchText(text);
    if (text.endsWith("\n")) {
      performSearch();
    }
  }

  async function performSearch() {
    if (!searchText.trim()) return;

    if (!isAuthenticated && !isAuthenticating) {
      showToast({
        style: Toast.Style.Animated,
        title: "Authenticating...",
        message: "Please wait while we authenticate",
      });
      await authenticate();
    }

    setQueryText(searchText.trim());
  }

  async function showTokenInfo() {
    const tokenInfo = await getTokenInfo();
    if (tokenInfo.token) {
      const expiresInfo = tokenInfo.expiresAt
        ? `Expires At: ${tokenInfo.expiresAt.toLocaleString()}`
        : `Expires In: ${tokenInfo.expiresIn || "unknown"} seconds`;
      await Clipboard.copy(tokenInfo.token);
      showToast({
        style: Toast.Style.Success,
        title: "Token Info",
        message: expiresInfo,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "No Token",
        message: "No access token found. Please authenticate first.",
      });
    }
  }

  function getErrorDetails() {
    const error = userError || statsError;
    if (!error) return null;

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    if (errorMessage.includes("unauthorized") || errorMessage.includes("Unauthorized")) {
      return {
        title: "Authentication Error",
        description: "Your access token may be invalid or expired. Please re-authenticate.",
        actions: (
          <ActionPanel>
            <Action title="Re-authenticate" onAction={authenticate} icon={Icon.Lock} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
          </ActionPanel>
        ),
      };
    }

    if (userError) {
      return {
        title: "User Not Found",
        description: "No user was found with that login. Please check the username and try again.",
        actions: (
          <ActionPanel>
            <Action title="Try Search Again" onAction={performSearch} icon={Icon.RotateClockwise} />
          </ActionPanel>
        ),
      };
    }

    if (errorMessage.includes("Forbidden") || errorMessage.includes("403")) {
      return {
        title: "Access Forbidden",
        description:
          "You don't have permission to access location stats for this user. Check your OAuth scopes or try viewing your own stats.",
        actions: (
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            <Action title="Try Search Again" onAction={performSearch} icon={Icon.RotateClockwise} />
          </ActionPanel>
        ),
      };
    }

    return {
      title: "Error",
      description: errorMessage,
      actions: (
        <ActionPanel>
          <Action title="Try Search Again" onAction={performSearch} icon={Icon.RotateClockwise} />
        </ActionPanel>
      ),
    };
  }

  const isLoading = isLoadingUser || isLoadingStats;

  return (
    <List
      onSearchTextChange={handleSearch}
      searchBarPlaceholder="Enter 42 login (e.g., jdoe) and press Enter"
      throttle
      isLoading={isLoading}
      searchBarAccessory={
        <ActionPanel>
          <Action
            title="Search"
            onAction={performSearch}
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: [], key: "return" }}
          />
        </ActionPanel>
      }
    >
      {isAuthenticating ? (
        <List.EmptyView
          title="Authenticating..."
          description="Please complete the OAuth flow to continue"
          icon={Icon.Lock}
        />
      ) : !isAuthenticated ? (
        <List.EmptyView
          title="Authentication Required"
          description="Please complete the OAuth flow to use this extension"
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action title="Authenticate" onAction={authenticate} icon={Icon.Lock} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      ) : userError || statsError ? (
        <List.EmptyView
          title={getErrorDetails()?.title || "Error"}
          description={getErrorDetails()?.description || "An unknown error occurred"}
          icon={Icon.ExclamationMark}
          actions={getErrorDetails()?.actions}
        />
      ) : !queryText ? (
        <List.EmptyView
          title="Enter a 42 login to check logtime"
          description="Type a 42 username in the search field above and press Enter"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action
                title="Search"
                onAction={performSearch}
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: [], key: "return" }}
              />
              <Action
                title="Show Token Info (debug)"
                onAction={showTokenInfo}
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
            </ActionPanel>
          }
        />
      ) : isLoadingUser ? (
        <List.EmptyView title="Loading..." description="Looking up user..." icon={Icon.MagnifyingGlass} />
      ) : isLoadingStats ? (
        <List.EmptyView
          title="Loading..."
          description={user?.login ? `Fetching location stats for ${user.login}...` : "Fetching location stats..."}
          icon={Icon.Clock}
        />
      ) : !stats || sortedDates.length === 0 ? (
        <List.EmptyView
          title="No Data Available"
          description="No location stats found for this user"
          icon={Icon.Clock}
        />
      ) : (
        <List.Section
          title={`Location Stats for ${user?.login || queryText}`}
          subtitle={`Total: ${totalTime} • ${sortedDates.length} days`}
        >
          {sortedDates.map((date) => (
            <List.Item
              key={date}
              title={date}
              subtitle={formatTime(stats[date], true)}
              icon={Icon.Clock}
              accessories={[
                {
                  text: formatTime(stats[date], true),
                  icon: Icon.Clock,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={`https://profile.intra.42.fr/users/${user?.login || queryText}`}
                    title="Open Profile"
                  />
                  <Action
                    title="Refresh"
                    onAction={performSearch}
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Show Token Info (debug)"
                    onAction={showTokenInfo}
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
