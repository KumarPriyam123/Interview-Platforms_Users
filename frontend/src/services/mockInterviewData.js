export const landingStats = [
  { value: '10k+', label: 'Active users' },
  { value: '50k+', label: 'Sessions completed' },
  { value: '3+', label: 'Core languages' },
]

export const landingFeatures = [
  {
    id: 'collab',
    icon: '</>',
    title: 'Real-time Collaboration',
    description:
      'Share code instantly with synchronized cursors and low-latency interactions.',
  },
  {
    id: 'feedback',
    icon: 'AI',
    title: 'AI-Powered Feedback',
    description:
      'Get immediate feedback on communication, problem solving, and coding quality.',
  },
  {
    id: 'video',
    icon: 'HD',
    title: 'HD Video Conferencing',
    description:
      'Simulate a complete face-to-face technical interview directly in your browser.',
  },
]

export const mockIndustryLeaders = [
  {
    id: 'i-001',
    name: 'Sarah Miller',
    role: 'Staff Engineer · Stripe',
    experience: '9 years',
    focus: 'Frontend architecture',
    rating: '4.9',
  },
  {
    id: 'i-002',
    name: 'Arjun Mehta',
    role: 'Principal Engineer · Microsoft',
    experience: '12 years',
    focus: 'Distributed systems',
    rating: '4.8',
  },
  {
    id: 'i-003',
    name: 'Elena Kim',
    role: 'Senior Engineering Manager · Atlassian',
    experience: '10 years',
    focus: 'System design & leadership',
    rating: '4.9',
  },
  {
    id: 'i-004',
    name: 'Daniel Rao',
    role: 'Senior Backend Engineer · Uber',
    experience: '8 years',
    focus: 'Backend coding rounds',
    rating: '4.7',
  },
]

export const mockInterviewPrompt =
  'Given the root of a binary tree, invert the tree and return its root.'

export const mockStarterCode = `var invertTree = function(root) {
  if (!root) {
    return null;
  }

  const temp = root.left;
  root.left = root.right;
  root.right = temp;

  invertTree(root.left);
  invertTree(root.right);

  return root;
};`

const executionStarterCodeByLanguage = {
  javascript: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

function invertTree(root) {
  if (!root) {
    return null;
  }

  const temp = root.left;
  root.left = root.right;
  root.right = temp;

  invertTree(root.left);
  invertTree(root.right);

  return root;
}

function serializeLevelOrder(root) {
  if (!root) {
    return [];
  }

  const queue = [root];
  const values = [];

  while (queue.length > 0) {
    const node = queue.shift();
    values.push(node.val);

    if (node.left) {
      queue.push(node.left);
    }

    if (node.right) {
      queue.push(node.right);
    }
  }

  return values;
}

const root = new TreeNode(
  4,
  new TreeNode(2, new TreeNode(1), new TreeNode(3)),
  new TreeNode(7, new TreeNode(6), new TreeNode(9)),
);

console.log(JSON.stringify(serializeLevelOrder(invertTree(root))));`,
  python: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def invert_tree(root):
    if root is None:
        return None

    root.left, root.right = root.right, root.left
    invert_tree(root.left)
    invert_tree(root.right)
    return root


def serialize_level_order(root):
    if root is None:
        return []

    queue = deque([root])
    values = []

    while queue:
        node = queue.popleft()
        values.append(node.val)

        if node.left:
            queue.append(node.left)

        if node.right:
            queue.append(node.right)

    return values


root = TreeNode(
    4,
    TreeNode(2, TreeNode(1), TreeNode(3)),
    TreeNode(7, TreeNode(6), TreeNode(9)),
)

print(serialize_level_order(invert_tree(root)))`,
  cpp: `#include <iostream>
#include <queue>
#include <utility>
#include <vector>

struct TreeNode {
  int val;
  TreeNode* left;
  TreeNode* right;

  TreeNode(int value, TreeNode* leftNode = nullptr, TreeNode* rightNode = nullptr)
      : val(value), left(leftNode), right(rightNode) {}
};

TreeNode* invertTree(TreeNode* root) {
  if (root == nullptr) {
    return nullptr;
  }

  std::swap(root->left, root->right);
  invertTree(root->left);
  invertTree(root->right);
  return root;
}

std::vector<int> serializeLevelOrder(TreeNode* root) {
  if (root == nullptr) {
    return {};
  }

  std::queue<TreeNode*> nodes;
  std::vector<int> values;
  nodes.push(root);

  while (!nodes.empty()) {
    TreeNode* node = nodes.front();
    nodes.pop();
    values.push_back(node->val);

    if (node->left != nullptr) {
      nodes.push(node->left);
    }

    if (node->right != nullptr) {
      nodes.push(node->right);
    }
  }

  return values;
}

int main() {
  TreeNode root(
      4,
      new TreeNode(2, new TreeNode(1), new TreeNode(3)),
      new TreeNode(7, new TreeNode(6), new TreeNode(9)));

  const std::vector<int> values = serializeLevelOrder(invertTree(&root));

  for (std::size_t index = 0; index < values.size(); ++index) {
    if (index > 0) {
      std::cout << ' ';
    }

    std::cout << values[index];
  }

  std::cout << std::endl;
  return 0;
}`,
  java: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

public class Main {
  static class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    TreeNode(int value) {
      this.val = value;
    }

    TreeNode(int value, TreeNode leftNode, TreeNode rightNode) {
      this.val = value;
      this.left = leftNode;
      this.right = rightNode;
    }
  }

  static TreeNode invertTree(TreeNode root) {
    if (root == null) {
      return null;
    }

    TreeNode temp = root.left;
    root.left = root.right;
    root.right = temp;

    invertTree(root.left);
    invertTree(root.right);
    return root;
  }

  static List<Integer> serializeLevelOrder(TreeNode root) {
    List<Integer> values = new ArrayList<>();

    if (root == null) {
      return values;
    }

    Queue<TreeNode> queue = new ArrayDeque<>();
    queue.add(root);

    while (!queue.isEmpty()) {
      TreeNode node = queue.remove();
      values.add(node.val);

      if (node.left != null) {
        queue.add(node.left);
      }

      if (node.right != null) {
        queue.add(node.right);
      }
    }

    return values;
  }

  public static void main(String[] args) {
    TreeNode root = new TreeNode(
        4,
        new TreeNode(2, new TreeNode(1), new TreeNode(3)),
        new TreeNode(7, new TreeNode(6), new TreeNode(9)));

    System.out.println(serializeLevelOrder(invertTree(root)));
  }
}`,
}

export function getExecutionStarterCode(language = 'javascript') {
  return executionStarterCodeByLanguage[language] || executionStarterCodeByLanguage.javascript
}

export function createExecutionStarterCodeByLanguage() {
  return { ...executionStarterCodeByLanguage }
}

export const mockChatMessages = [
  {
    id: 'c1',
    sender: 'interviewer',
    text: "Let's start with a classic. Can you walk me through your thought process for inverting a binary tree?",
    time: '10:42 AM',
  },
  {
    id: 'c2',
    sender: 'me',
    text: "Sure. I think I should use a recursive approach. I'll need to swap the left and right children for every node.",
    time: '10:43 AM',
  },
  {
    id: 'c3',
    sender: 'interviewer',
    text: "That's a solid idea. What is the base case for your recursion?",
    time: '10:43 AM',
  },
  {
    id: 'c4',
    sender: 'me',
    text: 'The base case is when the node is null — we just return null and stop recursing.',
    time: '10:44 AM',
  },
  {
    id: 'c5',
    sender: 'interviewer',
    text: 'Good. What is the time and space complexity of your solution?',
    time: '10:45 AM',
  },
]

export const mockTestCases = [
  {
    id: 'tc1',
    name: 'Case 1: Standard Tree',
    input: '[4,2,7,1,3,6,9]',
    expected: '[4,7,2,9,6,3,1]',
    passed: true,
  },
  {
    id: 'tc2',
    name: 'Case 2: Empty Tree',
    input: '[]',
    expected: '[]',
    passed: true,
  },
  {
    id: 'tc3',
    name: 'Case 3: Single Node',
    input: '[1,2]',
    expected: '[1,null,2]',
    passed: true,
  },
]

export const mockInterviewReport = {
  interviewId: 'TIQ-8824',
  duration: '45m',
  score: 84,
  performance: [
    { name: 'Communication', score: 92 },
    { name: 'Technical Skills', score: 78 },
    { name: 'Problem Solving', score: 85 },
    { name: 'Code Quality', score: 80 },
  ],
  strengths: [
    'Excellent usage of React hooks with clear architectural choices.',
    'Strong clarity while discussing time complexity and edge cases.',
    'Confident communication when negotiating constraints.',
  ],
  improvements: [
    'Separate utility logic from UI code for cleaner modularity.',
    'Cover null and empty inputs earlier in the solution explanation.',
    'Use more descriptive temporary variable names during implementation.',
  ],
}
