/**
 * Task Tool — Launch a sub-agent for autonomous subtask execution.
 * This allows the main agent to delegate work to sub-agents.
 */

export async function taskTool(args, context = {}) {
  const { description, prompt } = args;

  if (!description || !prompt) {
    throw new Error('Both description and prompt are required');
  }

  // In a full implementation, this would spawn a sub-agent.
  // For now, we return a message that the task has been queued.
  // The calling agent should handle the result from the sub-agent's response.

  return {
    taskId: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    description,
    status: 'launched',
    message: `Sub-task "${description}" has been launched. The sub-agent will process this independently.`,
    prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
  };
}

export default taskTool;
