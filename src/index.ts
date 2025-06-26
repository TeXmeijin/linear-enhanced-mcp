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
import { url } from "inspector";

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
  console.error(
    "Optional: Set LINEAR_TEAM_NAME to customize server name (linear-mcp-for-X)"
  );
  console.error(
    "LINEAR_TEAM_NAME=your-team-name LINEAR_API_KEY=your-api-key npx @ibraheem4/linear-mcp"
  );
  process.exit(1);
}

// チーム名が設定されている場合は、そのことを表示
if (TEAM_NAME) {
  console.error(
    `Team name set to "${TEAM_NAME}". Server will be named linear-mcp-for-${TEAM_NAME}.`
  );
}

const linearClient = new LinearClient({
  apiKey: API_KEY,
});

// capabilitiesを生成
const toolsCapabilities: Record<string, boolean> = {};
const baseTools = [
  "create_issue",
  "list_issues",
  "update_issue",
  "list_teams_and_states",
  "list_projects",
  "search_issues",
  "get_issue",
  "list_labels",
  "create_label",
  "update_label",
  "list_team_members",
  "list_project_states",
  "get_project",
  "create_project",
  "update_project",
  "list_project_statuses",
];
baseTools.forEach((tool) => {
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
              description:
                "Assignee user ID (optional, 未指定の場合は自分が割り当てられます。明示的にnullを指定するとassigneeなしになります)",
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
            projectId: {
              type: "string",
              description: "Project ID (optional)",
            },
            stateId: {
              type: "string",
              description: "Status UUID (optional)",
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
            statusName: {
              type: "string",
              description: "Filter by status name (optional)",
            },
            statusUUID: {
              type: "string",
              description: "Filter by status UUID (optional)",
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
                type: "string",
              },
              description:
                "ラベルIDの配列（オプション）、指定したラベルで置き換えられます",
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
        name: "list_teams_and_states",
        description: "List all teams with their workflow states",
        inputSchema: { type: "object", properties: {} },
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
            projectName: {
              type: "string",
              description: "プロジェクト名の部分一致でフィルタリング (optional)",
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
            teamId: {
              type: "string",
              description: "Filter by team ID (optional)",
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
      {
        name: "list_team_members",
        description: "チームに所属するメンバー一覧を取得",
        inputSchema: {
          type: "object",
          properties: {
            teamId: {
              type: "string",
              description: "チームID",
            },
          },
          required: ["teamId"],
        },
      },
      {
        name: "list_project_states",
        description: "List all distinct project states",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_project",
        description: "Get detailed information about a specific project",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "Project ID",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "create_project",
        description: "Create a new project in Linear",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Project name (required)",
            },
            teamId: {
              type: "string",
              description: "Team ID (required)",
            },
            description: {
              type: "string",
              description: "Project description (optional)",
            },
            content: {
              type: "string",
              description: "Project content in markdown format (optional)",
            },
            leadId: {
              type: "string",
              description:
                "Project lead user ID (optional, 未指定の場合は自分がリードに設定されます)",
            },
            statusId: {
              type: "string",
              description: "Project status ID (optional)",
            },
          },
          required: ["name", "teamId"],
        },
      },
      {
        name: "update_project",
        description: "Update an existing project in Linear",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "Project ID (required)",
            },
            name: {
              type: "string",
              description: "New project name (optional)",
            },
            description: {
              type: "string",
              description: "New project description (optional)",
            },
            content: {
              type: "string",
              description: "New project content in markdown format (optional)",
            },
            leadId: {
              type: "string",
              description: "New project lead user ID (optional)",
            },
            statusId: {
              type: "string",
              description: "New project status ID (optional)",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "list_project_statuses",
        description: "プロジェクトに指定できるステータスの一覧を取得",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

type CreateIssueArgs = {
  title: string;
  description?: string;
  teamId: string;
  assigneeId?: string | null;
  priority?: number;
  labels?: string[];
  parentId?: string;
  projectId?: string;
  stateId?: string;
};

type ListIssuesArgs = {
  teamId?: string;
  assigneeId?: string;
  statusName?: string;
  statusUUID?: string;
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
  projectName?: string;
};

type SearchIssuesArgs = {
  query: string;
  first?: number;
  teamId?: string;
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

type ListStatesArgs = {
  teamId: string;
};

type ListTeamMembersArgs = {
  teamId: string;
};

type GetProjectArgs = {
  projectId: string;
};

type CreateProjectArgs = {
  name: string;
  teamId: string;
  description?: string;
  content?: string;
  leadId?: string;
  statusId?: string;
};

type UpdateProjectArgs = {
  projectId: string;
  name?: string;
  description?: string;
  content?: string;
  leadId?: string;
  statusId?: string;
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

        console.error("Creating issue with args:", args);

        // assigneeIdが未指定の場合、現在のユーザーを割り当てる
        let assigneeId = args.assigneeId;
        if (assigneeId === undefined) {
          const viewer = await linearClient.viewer;
          assigneeId = viewer.id;
        }
        // assigneeIdがnullの場合はそのまま（担当者なし）

        const issuePayload = await linearClient.createIssue({
          title: args.title,
          description: args.description,
          teamId: args.teamId,
          assigneeId: assigneeId,
          priority: args.priority,
          labelIds: args.labels,
          parentId: args.parentId,
          projectId: args.projectId,
          stateId: args.stateId,
        });

        const issue = await issuePayload.issue;

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
        if (args?.statusName) filter.state = { name: { eq: args.statusName } };
        if (args?.statusUUID) {
          filter.state = { id: { eq: args.statusUUID } };
        }

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
              identifier: issue.identifier,
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
              text: JSON.stringify({
                ...updatedIssue,
                issueUrl: issue.url,
              }, null, 2),
            },
          ],
        };
      }

      case "list_teams_and_states": {
        const teamsQuery = await linearClient.teams();
        const teamsWithStates = await Promise.all(
          (teamsQuery as any).nodes.map(async (team: any) => {
            const statesQuery = await team.states();
            const states = statesQuery.nodes.map((state: any) => ({
              id: state.id,
              name: state.name,
              color: state.color,
              type: state.type,
              position: state.position,
              description: state.description,
              teamId: team.id,
            }));
            return {
              id: team.id,
              name: team.name,
              key: team.key,
              description: team.description,
              states,
            };
          })
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(teamsWithStates, null, 2) },
          ],
        };
      }

      case "list_projects": {
        const args = request.params.arguments as unknown as ListProjectsArgs;
        const filter: ProjectFilter = {};
        if (args?.teamId) filter.accessibleTeams = { id: { eq: args.teamId } };
        if (args?.projectName) filter.name = { contains: args.projectName };

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

        let nodes = searchResults.nodes;
        if (args.teamId) {
          const filtered: typeof nodes = [];
          for (const result of nodes) {
            const team = await result.team;
            if (team && team.id === args.teamId) {
              filtered.push(result);
            }
          }
          nodes = filtered;
        }

        const formattedResults = await Promise.all(
          nodes.map(async (result) => {
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
            relations: Array<{
              id: string;
              type: string;
              issue: { id: string; title: string };
            }>;
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
              },
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
            attachments.nodes.map(async (attachment: any) => ({
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

      case "list_team_members": {
        const args = request.params.arguments as unknown as ListTeamMembersArgs;
        if (!args?.teamId) {
          throw new Error("Team ID is required");
        }

        const team = await linearClient.team(args.teamId);
        if (!team) {
          throw new Error(`Team ${args.teamId} not found`);
        }

        // チームメンバーシップを取得
        const memberships = await team.memberships();

        // メンバーシップからユーザー情報を取得
        const teamMembers = [];
        for (const membership of memberships.nodes) {
          try {
            // メンバーシップからユーザーIDを取得して、userを検索
            const user = await linearClient.user(membership.id);
            if (user) {
              teamMembers.push({
                id: user.id,
                name: user.name,
                // email: user.email,
                displayName: user.displayName,
                active: user.active,
                // avatarUrl: user.avatarUrl,
                // lastSeen: user.lastSeen,
                // createdAt: user.createdAt,
                // updatedAt: user.updatedAt
              });
            }
          } catch (error) {
            console.error(`Error fetching user for membership: ${error}`);
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(teamMembers, null, 2),
            },
          ],
        };
      }

      case "list_project_states": {
        const states = await linearClient.projectStatuses();
        const formattedStates = states.nodes.map((state) => ({
          id: state.id,
          name: state.name,
          color: state.color,
          type: state.type,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedStates, null, 2),
            },
          ],
        };
      }

      case "get_project": {
        const args = request.params.arguments as unknown as GetProjectArgs;
        if (!args?.projectId) {
          throw new Error("Project ID is required");
        }

        const project = await linearClient.project(args.projectId);
        if (!project) {
          throw new Error(`Project ${args.projectId} not found`);
        }

        // 詳細情報を取得
        const [teams, issues, members, externalLinks] = await Promise.all([
          project.teams(),
          project.issues({ first: 50 }),
          project.members(),
          project.externalLinks(),
        ]);

        // プロジェクトの詳細情報を整形
        const projectDetails = {
          id: project.id,
          name: project.name,
          description: project.description,
          content: project.content,
          state: project.state,
          url: project.url,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          startDate: project.startDate,
          targetDate: project.targetDate,
          completedAt: project.completedAt,
          progress: project.progress,
          teams: await Promise.all(
            teams.nodes.map(async (team) => ({
              id: team.id,
              name: team.name,
              key: team.key,
            }))
          ),
          issues: await Promise.all(
            issues.nodes.map(async (issue) => {
              const state = await issue.state;
              return {
                id: issue.id,
                title: issue.title,
                identifier: issue.identifier,
                status: state ? state.name : "Unknown",
                priority: issue.priority,
              };
            })
          ),
          members: await Promise.all(
            members.nodes.map(async (member) => ({
              id: member.id,
              name: member.name,
              displayName: member.displayName,
            }))
          ),
          externalLinks: await Promise.all(
            externalLinks.nodes.map(async (externalLink) => ({
              id: externalLink.id,
              label: externalLink.label,
              url: externalLink.url,
            }))
          ),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(projectDetails, null, 2),
            },
          ],
        };
      }

      case "create_project": {
        const args = request.params.arguments as unknown as CreateProjectArgs;
        if (!args?.name || !args?.teamId) {
          throw new Error("Project name and team ID are required");
        }

        const team = await linearClient.team(args.teamId);
        if (!team) {
          throw new Error(`Team ${args.teamId} not found`);
        }

        // leadIdが未指定の場合、現在のユーザーを設定
        let leadId = args.leadId;
        if (leadId === undefined) {
          const viewer = await linearClient.viewer;
          leadId = viewer.id;
        }

        const project = await linearClient.createProject({
          name: args.name,
          teamIds: [args.teamId],
          description: args.description || undefined,
          content: args.content || undefined,
          leadId: leadId,
          statusId: args.statusId,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case "update_project": {
        const args = request.params.arguments as unknown as UpdateProjectArgs;
        if (!args?.projectId) {
          throw new Error("Project ID is required");
        }

        const project = await linearClient.project(args.projectId);
        if (!project) {
          throw new Error(`Project ${args.projectId} not found`);
        }

        const updatedProject = await linearClient.updateProject(
          args.projectId,
          {
            name: args.name,
            description: args.description || undefined,
            content: args.content || undefined,
            leadId: args.leadId,
            statusId: args.statusId,
          }
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(updatedProject, null, 2),
            },
          ],
        };
      }

      case "list_project_statuses": {
        const statuses = await linearClient.projectStatuses();

        const formattedStatuses = statuses.nodes.map((status) => {
          return {
            id: status.id,
            name: status.name,
            description: status.description,
            type: status.type,
          };
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedStatuses, null, 2),
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
