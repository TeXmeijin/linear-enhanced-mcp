#!/usr/bin/env node

import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Load .env file from the project root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

import { LinearClient } from "@linear/sdk";
import { ProjectFilter } from "@linear/sdk/dist/_generated_documents";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.LINEAR_API_KEY || process.env.LINEARAPIKEY;
const TEAM_NAME = process.env.LINEAR_TEAM_NAME || process.env.LINEARTEAMNAME;

if (!API_KEY) {
  console.error("Error: LINEAR_API_KEY environment variable is required");
  console.error("");
  console.error("To use this tool, run it with your Linear API key:");
  console.error("LINEAR_API_KEY=your-api-key npx @ibraheem4/linear-mcp");
  console.error("");
  console.error("Or set it in your environment:");
  console.error("export LINEAR_API_KEY=your-api-key");
  console.error("npx @ibraheem4/linear-mcp");
  console.error("");
  console.error("Optional: Set LINEAR_TEAM_NAME to customize server name (linear-mcp-for-X)");
  console.error("LINEAR_TEAM_NAME=your-team-name LINEAR_API_KEY=your-api-key npx @ibraheem4/linear-mcp");
  process.exit(1);
}

// チーム名が設定されている場合は、そのことを表示
if (TEAM_NAME) {
  console.error(`Team name set to "${TEAM_NAME}". Server will be named linear-mcp-for-${TEAM_NAME}.`);
}

const linearClient = new LinearClient({
  apiKey: API_KEY,
});

// capabilitiesを生成
const toolsCapabilities: Record<string, boolean> = {};
const baseTools = ["create_issue", "list_issues", "update_issue", "list_teams", "list_projects", "search_issues", "get_issue", "list_labels", "create_label", "update_label"];
baseTools.forEach(tool => {
  toolsCapabilities[tool] = true;
});

const server = new Server(
  {
    name: TEAM_NAME ? `linear-mcp-for-${TEAM_NAME}` : "linear-mcp",
    version: "37.0.0", // Match Linear SDK version
  },
  {
    capabilities: {
      tools: toolsCapabilities,
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_issue",
        description: "Create a new issue in Linear",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Issue title",
            },
            description: {
              type: "string",
              description: "Issue description (markdown supported)",
            },
            teamId: {
              type: "string",
              description: "Team ID",
            },
            assigneeId: {
              type: "string",
              description: "Assignee user ID (optional)",
            },
            priority: {
              type: "number",
              description: "Priority (0-4, optional)",
              minimum: 0,
              maximum: 4,
            },
            labels: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Label IDs to apply (optional)",
            },
            parentId: {
              type: "string",
              description: "Parent issue ID (optional)",
            },
          },
          required: ["title", "teamId"],
        },
      },
      {
        name: "list_issues",
        description: "List issues with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            teamId: {
              type: "string",
              description: "Filter by team ID (optional)",
            },
            assigneeId: {
              type: "string",
              description: "Filter by assignee ID (optional)",
            },
            status: {
              type: "string",
              description: "Filter by status (optional)",
            },
            first: {
              type: "number",
              description: "Number of issues to return (default: 50)",
            },
          },
        },
      },
      {
        name: "update_issue",
        description: "Update an existing issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: {
              type: "string",
              description: "Issue ID",
            },
            title: {
              type: "string",
              description: "New title (optional)",
            },
            description: {
              type: "string",
              description: "New description (optional)",
            },
            status: {
              type: "string",
              description: "New status (optional)",
            },
            assigneeId: {
              type: "string",
              description: "New assignee ID (optional)",
            },
            priority: {
              type: "number",
              description: "New priority (0-4, optional)",
              minimum: 0,
              maximum: 4,
            },
            labels: {
              type: "array",
              items: {
                type: "string"
              },
              description: "ラベルIDの配列（オプション）、指定したラベルで置き換えられます",
            },
            parentId: {
              type: "string",
              description: "親のIssue ID (optional)",
            },
            projectId: {
              type: "string",
              description: "Project ID (optional)",
            },
          },
          required: ["issueId"],
        },
      },
      {
        name: "list_teams",
        description: "List all teams in the workspace",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_projects",
        description: "List all projects",
        inputSchema: {
          type: "object",
          properties: {
            teamId: {
              type: "string",
              description: "Filter by team ID (optional)",
            },
            first: {
              type: "number",
              description: "Number of projects to return (default: 50)",
            },
          },
        },
      },
      {
        name: "search_issues",
        description: "Search for issues using a text query",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query text",
            },
            first: {
              type: "number",
              description: "Number of results to return (default: 50)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_issue",
        description: "Get detailed information about a specific issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: {
              type: "string",
              description: "Issue ID",
            },
          },
          required: ["issueId"],
        },
      },
      {
        name: "list_labels",
        description: "チームに紐づくラベルの一覧を取得",
        inputSchema: {
          type: "object",
          properties: {
            teamId: {
              type: "string",
              description: "Team ID",
            },
          },
          required: ["teamId"],
        },
      },
      {
        name: "create_label",
        description: "新しいラベルを作成",
        inputSchema: {
          type: "object",
          properties: {
            teamId: {
              type: "string",
              description: "Team ID",
            },
            name: {
              type: "string",
              description: "ラベルの名前",
            },
            color: {
              type: "string",
              description: "ラベルの色（16進数カラーコード）",
            },
            description: {
              type: "string",
              description: "ラベルの説明（オプション）",
            },
          },
          required: ["teamId", "name", "color"],
        },
      },
      {
        name: "update_label",
        description: "既存のラベルを編集",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "ラベルID",
            },
            name: {
              type: "string",
              description: "新しいラベル名（オプション）",
            },
            color: {
              type: "string",
              description: "新しい色（16進数カラーコード、オプション）",
            },
            description: {
              type: "string",
              description: "新しい説明（オプション）",
            },
          },
          required: ["id"],
        },
      },
    ],
  };
});

type CreateIssueArgs = {
  title: string;
  description?: string;
  teamId: string;
  assigneeId?: string;
  priority?: number;
  labels?: string[];
  parentId?: string;
};

type ListIssuesArgs = {
  teamId?: string;
  assigneeId?: string;
  status?: string;
  first?: number;
};

type UpdateIssueArgs = {
  issueId: string;
  title?: string;
  description?: string;
  status?: string;
  assigneeId?: string;
  priority?: number;
  labels?: string[];
  parentId?: string;
  projectId?: string;
};

type ListProjectsArgs = {
  teamId?: string;
  first?: number;
};

type SearchIssuesArgs = {
  query: string;
  first?: number;
};

type GetIssueArgs = {
  issueId: string;
};

type ListLabelsArgs = {
  teamId: string;
};

type CreateLabelArgs = {
  teamId: string;
  name: string;
  color: string;
  description?: string;
};

type UpdateLabelArgs = {
  id: string;
  name?: string;
  color?: string;
  description?: string;
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const toolName = request.params.name;

    switch (toolName) {
      case "create_issue": {
        const args = request.params.arguments as unknown as CreateIssueArgs;
        if (!args?.title || !args?.teamId) {
          throw new Error("Title and teamId are required");
        }

        const issue = await linearClient.createIssue({
          title: args.title,
          description: args.description,
          teamId: args.teamId,
          assigneeId: args.assigneeId,
          priority: args.priority,
          labelIds: args.labels,
          parentId: args.parentId,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      }

      case "list_issues": {
        const args = request.params.arguments as unknown as ListIssuesArgs;
        const filter: Record<string, any> = {};
        if (args?.teamId) filter.team = { id: { eq: args.teamId } };
        if (args?.assigneeId) filter.assignee = { id: { eq: args.assigneeId } };
        if (args?.status) filter.state = { name: { eq: args.status } };

        const issues = await linearClient.issues({
          first: args?.first ?? 50,
          filter,
        });

        const formattedIssues = await Promise.all(
          issues.nodes.map(async (issue) => {
            const state = await issue.state;
            const assignee = await issue.assignee;
            return {
              id: issue.id,
              title: issue.title,
              status: state ? await state.name : "Unknown",
              assignee: assignee ? assignee.name : "Unassigned",
              priority: issue.priority,
              url: issue.url,
              statusUUID: state ? await state.id : null,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedIssues, null, 2),
            },
          ],
        };
      }

      case "update_issue": {
        const args = request.params.arguments as unknown as UpdateIssueArgs;
        if (!args?.issueId) {
          throw new Error("Issue ID is required");
        }

        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          throw new Error(`Issue ${args.issueId} not found`);
        }

        const updatedIssue = await issue.update({
          title: args.title,
          description: args.description,
          stateId: args.status,
          assigneeId: args.assigneeId,
          labelIds: args.labels,
          priority: args.priority,
          parentId: args.parentId,
          projectId: args.projectId,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(updatedIssue, null, 2),
            },
          ],
        };
      }

      case "list_teams": {
        const query = await linearClient.teams();
        const teams = await Promise.all(
          (query as any).nodes.map(async (team: any) => ({
            id: team.id,
            name: team.name,
            key: team.key,
            description: team.description,
          }))
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(teams, null, 2),
            },
          ],
        };
      }

      case "list_projects": {
        const args = request.params.arguments as unknown as ListProjectsArgs;
        const filter: ProjectFilter = {};
        if (args?.teamId) filter.accessibleTeams = { id: { eq: args.teamId } };

        const query = await linearClient.projects({
          first: args?.first ?? 50,
          filter,
        });

        const projects = await Promise.all(
          query.nodes.map(async (project) => {
            return {
              id: project.id,
              name: project.name,
              description: project.description,
              state: project.state,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      case "search_issues": {
        const args = request.params.arguments as unknown as SearchIssuesArgs;
        if (!args?.query) {
          throw new Error("Search query is required");
        }

        const searchResults = await linearClient.searchIssues(args.query, {
          first: args?.first ?? 50,
        });

        const formattedResults = await Promise.all(
          searchResults.nodes.map(async (result) => {
            const state = await result.state;
            const assignee = await result.assignee;
            return {
              id: result.id,
              title: result.title,
              status: state ? await state.name : "Unknown",
              assignee: assignee ? assignee.name : "Unassigned",
              priority: result.priority,
              url: result.url,
              metadata: result.metadata,
              statusUUID: state ? await state.id : null,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedResults, null, 2),
            },
          ],
        };
      }

      case "get_issue": {
        const args = request.params.arguments as unknown as GetIssueArgs;
        if (!args?.issueId) {
          throw new Error("Issue ID is required");
        }

        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          throw new Error(`Issue ${args.issueId} not found`);
        }

        try {
          const [
            state,
            assignee,
            creator,
            team,
            project,
            parent,
            cycle,
            labels,
            comments,
            attachments,
            relations,
          ] = await Promise.all([
            issue.state,
            issue.assignee,
            issue.creator,
            issue.team,
            issue.project,
            issue.parent,
            issue.cycle,
            issue.labels(),
            issue.comments(),
            issue.attachments(),
            issue.relations(),
          ]);

          const issueDetails: {
            id: string;
            identifier: string;
            title: string;
            description: string | undefined;
            priority: number;
            priorityLabel: string;
            status: string;
            statusUUID: string | null;
            url: string;
            createdAt: Date;
            updatedAt: Date;
            startedAt: Date | null;
            completedAt: Date | null;
            canceledAt: Date | null;
            dueDate: string | null;
            assignee: { id: string; name: string; email: string } | null;
            creator: { id: string; name: string; email: string } | null;
            team: { id: string; name: string; key: string } | null;
            project: { id: string; name: string; state: string } | null;
            parent: { id: string; title: string; identifier: string } | null;
            cycle: { id: string; name: string; number: number } | null;
            labels: Array<{ id: string; name: string; color: string }>;
            comments: Array<{ id: string; body: string; createdAt: Date }>;
            attachments: Array<{ id: string; title: string; url: string }>;
            embeddedImages: Array<{ url: string; analysis: string }>;
            estimate: number | null;
            customerTicketCount: number;
            previousIdentifiers: string[];
            branchName: string;
            archivedAt: Date | null;
            autoArchivedAt: Date | null;
            autoClosedAt: Date | null;
            trashed: boolean;
            relations: Array<{ id: string; type: string; issue: { id: string; title: string } }>;
          } = {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description,
            priority: issue.priority,
            priorityLabel: issue.priorityLabel,
            status: state ? await state.name : "Unknown",
            statusUUID: state ? await state.id : null,
            url: issue.url,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            startedAt: issue.startedAt || null,
            completedAt: issue.completedAt || null,
            canceledAt: issue.canceledAt || null,
            dueDate: issue.dueDate,
            assignee: assignee
              ? {
                id: assignee.id,
                name: assignee.name,
                email: assignee.email,
              }
              : null,
            creator: creator
              ? {
                id: creator.id,
                name: creator.name,
                email: creator.email,
              }
              : null,
            team: team
              ? {
                id: team.id,
                name: team.name,
                key: team.key,
              }
              : null,
            project: project
              ? {
                id: project.id,
                name: project.name,
                state: project.state,
              }
              : null,
            parent: parent
              ? {
                id: parent.id,
                title: parent.title,
                identifier: parent.identifier,
              }
              : null,
            cycle:
              cycle && cycle.name
                ? {
                  id: cycle.id,
                  name: cycle.name,
                  number: cycle.number,
                }
                : null,
            labels: await Promise.all(
              labels.nodes.map(async (label: any) => ({
                id: label.id,
                name: label.name,
                color: label.color,
              }))
            ),
            comments: await Promise.all(
              comments.nodes.map(async (comment: any) => ({
                id: comment.id,
                body: comment.body,
                createdAt: comment.createdAt,
              }))
            ),
            attachments: await Promise.all(
              attachments.nodes.map(async (attachment: any) => ({
                id: attachment.id,
                title: attachment.title,
                url: attachment.url,
              }))
            ),
            embeddedImages: [],
            estimate: issue.estimate || null,
            customerTicketCount: issue.customerTicketCount || 0,
            previousIdentifiers: issue.previousIdentifiers || [],
            branchName: issue.branchName || "",
            archivedAt: issue.archivedAt || null,
            autoArchivedAt: issue.autoArchivedAt || null,
            autoClosedAt: issue.autoClosedAt || null,
            trashed: issue.trashed || false,
            relations: relations.nodes.map((relation: any) => ({
              id: relation.id,
              type: relation.type,
              issue: {
                id: relation.issue.id,
                title: relation.issue.title,
              }
            })),
          };

          // Extract embedded images from description
          const imageMatches =
            issue.description?.match(/!\[.*?\]\((.*?)\)/g) || [];
          if (imageMatches.length > 0) {
            issueDetails.embeddedImages = imageMatches.map((match) => {
              const url = (match as string).match(/\((.*?)\)/)?.[1] || "";
              return {
                url,
                analysis: "Image analysis would go here", // Replace with actual image analysis if available
              };
            });
          }

          // Add image analysis for attachments if they are images
          issueDetails.attachments = await Promise.all(
            attachments.nodes
              .map(async (attachment: any) => ({
                id: attachment.id,
                title: attachment.title,
                url: attachment.url,
              }))
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(issueDetails, null, 2),
              },
            ],
          };
        } catch (error: any) {
          console.error("Error processing issue details:", error);
          throw new Error(`Failed to process issue details: ${error.message}`);
        }
      }

      case "list_labels": {
        const args = request.params.arguments as unknown as ListLabelsArgs;
        if (!args?.teamId) {
          throw new Error("Team ID is required");
        }

        const team = await linearClient.team(args.teamId);
        if (!team) {
          throw new Error(`Team ${args.teamId} not found`);
        }

        const labels = await team.labels();

        const formattedLabels = labels.nodes.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color,
          description: label.description,
          createdAt: label.createdAt,
          updatedAt: label.updatedAt,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedLabels, null, 2),
            },
          ],
        };
      }

      case "create_label": {
        const args = request.params.arguments as unknown as CreateLabelArgs;
        if (!args?.teamId || !args?.name || !args?.color) {
          throw new Error("Team ID, name, and color are required");
        }

        const label = await linearClient.createIssueLabel({
          teamId: args.teamId,
          name: args.name,
          color: args.color,
          description: args.description,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(label, null, 2),
            },
          ],
        };
      }

      case "update_label": {
        const args = request.params.arguments as unknown as UpdateLabelArgs;
        if (!args?.id) {
          throw new Error("Label ID is required");
        }

        const label = await linearClient.issueLabel(args.id);
        if (!label) {
          throw new Error(`Label ${args.id} not found`);
        }

        const updatedLabel = await label.update({
          name: args.name,
          color: args.color,
          description: args.description,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(updatedLabel, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
    }
  } catch (error: any) {
    console.error("Linear API Error:", error);
    return {
      content: [
        {
          type: "text",
          text: `Linear API error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Linear MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
