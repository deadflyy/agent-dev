---
name: "requirement-clarifier"
description: "Helps clarify ambiguous user requirements by generating a list of specific questions. Invoke when user's request is vague, incomplete, or lacks sufficient details for implementation."
---

# Requirement Clarifier

## Purpose

This skill helps clarify ambiguous user requirements by generating a structured list of questions that need to be answered to properly understand and implement the requested task. It is designed to guide users in providing the necessary details for software development, system design, or any technical implementation.

## When to Invoke

Invoke this skill when:
- User's request is vague or lacks specific details
- The task requires more information to proceed effectively
- There are multiple possible interpretations of the user's request
- The user hasn't provided enough context for proper implementation

## How It Works

1. **Analyze the user's request** to identify gaps in information
2. **Generate targeted questions** based on the type of request
3. **Organize questions by category** for clarity
4. **Present questions** to the user in a structured format

## Question Categories

### 1. Project Context
- What is the overall goal of this project/task?
- What is the timeline for completion?
- Are there any budget constraints?
- What is the intended audience or user base?

### 2. Technical Requirements
- What technologies/frameworks must be used?
- Are there any existing systems that need to be integrated?
- What are the performance requirements (e.g., response time, scalability)?
- Are there any security constraints or compliance requirements?

### 3. Functional Requirements
- What specific features need to be implemented?
- What are the expected user interactions?
- Are there any edge cases that need to be handled?
- What is the expected behavior in error scenarios?

### 4. Non-Functional Requirements
- What are the usability requirements?
- What are the reliability requirements?
- What are the maintainability requirements?
- Are there any documentation requirements?

### 5. Design and User Experience
- Are there any design specifications or guidelines?
- What is the expected user interface style?
- Are there any accessibility requirements?
- Are there any branding requirements?

## Usage Examples

### Example 1: Vague Feature Request

**User Request:** "I need a website for my business."

**Clarification Questions:**
- What type of business do you have?
- What specific features do you need on the website (e.g., contact form, product catalog, blog)?
- Do you have any existing branding or design preferences?
- What is your budget and timeline for this project?
- Do you need any integration with existing systems (e.g., CRM, e-commerce platform)?

### Example 2: Ambiguous Technical Task

**User Request:** "I need to optimize my database."

**Clarification Questions:**
- What specific database system are you using?
- What performance issues are you experiencing?
- How large is your database (in terms of data size and number of records)?
- What queries are currently causing performance problems?
- Are there any constraints on downtime during optimization?

### Example 3: Incomplete Feature Description

**User Request:** "I want a mobile app that helps people track their fitness."

**Clarification Questions:**
- Which platforms do you need to support (iOS, Android, both)?
- What specific fitness metrics do you want to track?
- Do you need social features (e.g., sharing, leaderboards)?
- Are there any third-party integrations needed (e.g., with fitness trackers, health apps)?
- What is the expected user flow for the app?

## Best Practices

- Be specific and concise in your questions
- Focus on information that is critical for implementation
- Avoid asking redundant questions
- Prioritize questions based on importance
- Adapt questions to the specific context of the request

## Output Format

When using this skill, the output should be a well-organized list of questions grouped by category, with clear explanations of why each question is important for understanding the requirement.