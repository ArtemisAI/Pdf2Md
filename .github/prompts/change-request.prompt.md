# Change Request Template - AI Agent Prompt

## 📋 Overview

This prompt provides comprehensive instructions for AI agents to write structured, clear, and actionable change requests following proven methodologies. Use this template to create well-organized change requests that are unambiguous and implementation-ready.

## 🎯 Objective

Generate a comprehensive change request document that includes:
- **Clear Problem Statement** with current vs desired state
- **Unambiguous Requirements** with specific deliverables
- **Structured Implementation Plan** with phases and timelines
- **Testing Strategy** with validation criteria
- **Success Metrics** with measurable outcomes

---

## 📝 **CHANGE REQUEST TEMPLATE STRUCTURE**

### **File Naming Convention**
```
CHANGE_REQUEST_{NUMBER}_{BRIEF_DESCRIPTION}.md
```

**Examples:**
- `CHANGE_REQUEST_5_MCP_HTTP.md` - Convert MCP to HTTP architecture
- `CHANGE_REQUEST_6_GPU_OPTIMIZATION.md` - Enhance GPU performance
- `CHANGE_REQUEST_7_SECURITY_UPGRADE.md` - Implement OAuth authentication

### **File Location**
```
.github/change-requests/CHANGE_REQUEST_{NUMBER}_{DESCRIPTION}.md
```

---

## 🏗️ **DOCUMENT STRUCTURE TEMPLATE**

```markdown
# Change Request {NUMBER}: {Brief Title}

## Hi GitHub Copilot! 👋

Please see below our current situation and implementation requirements for {brief description of the change}.

---

## 📋 **CURRENT SITUATION - What We Have**

### **Current Implementation**
{Describe the existing system/architecture/functionality}

**✅ Current State:**
- **Architecture**: {Current technical architecture}
- **Implementation**: {Current implementation details}
- **Deployment**: {How it's currently deployed/used}
- **Performance**: {Current performance metrics}
- **Limitations**: {Current limitations or pain points}

**✅ Existing Capabilities:**
- **Feature 1**: {Description and current functionality}
- **Feature 2**: {Description and current functionality}
- **Feature 3**: {Description and current functionality}

**✅ Technical Stack:**
- **Runtime**: {Current runtime/platform}
- **Dependencies**: {Key dependencies and versions}
- **Infrastructure**: {Current infrastructure/deployment}

---

## 🎯 **REQUIREMENTS - What We Need**

### **Target Architecture: {Target System Description}**

**🔄 Transform From:** {Current state brief description}  
**🔄 Transform To:** {Target state brief description}

**📋 Core Requirements:**

#### **1. {Requirement Category 1}**
- **Requirement 1A**: {Specific requirement}
- **Requirement 1B**: {Specific requirement}
- **Requirement 1C**: {Specific requirement}

#### **2. {Requirement Category 2}**
- **Requirement 2A**: {Specific requirement}
- **Requirement 2B**: {Specific requirement}
- **Requirement 2C**: {Specific requirement}

#### **3. {Requirement Category 3}**
- **Requirement 3A**: {Specific requirement}
- **Requirement 3B**: {Specific requirement}
- **Requirement 3C**: {Specific requirement}

---

## 🚀 **IMPLEMENTATION OBJECTIVES - What You Should Accomplish**

### **Phase 1: {Phase Name} (Timeline)**

**🎯 Primary Objective**: {Clear phase objective}

**What You Must Do:**
1. **Task 1**:
   ```{language}
   // Code example or configuration
   {specific implementation details}
   ```

2. **Task 2**:
   ```{language}
   // Code example or configuration
   {specific implementation details}
   ```

3. **Task 3**:
   ```{language}
   // Code example or configuration
   {specific implementation details}
   ```

**Deliverables:**
- [ ] {Specific deliverable 1}
- [ ] {Specific deliverable 2}
- [ ] {Specific deliverable 3}
- [ ] {Specific deliverable 4}

### **Phase 2: {Phase Name} (Timeline)**

**🎯 Primary Objective**: {Clear phase objective}

**What You Must Do:**
1. **Task 1**: {Detailed task description}
2. **Task 2**: {Detailed task description}
3. **Task 3**: {Detailed task description}

**Deliverables:**
- [ ] {Specific deliverable 1}
- [ ] {Specific deliverable 2}
- [ ] {Specific deliverable 3}

### **Phase 3: {Phase Name} (Timeline)**

**🎯 Primary Objective**: {Clear phase objective}

**What You Must Do:**
1. **Task 1**: {Detailed task description}
2. **Task 2**: {Detailed task description}
3. **Task 3**: {Detailed task description}

**Deliverables:**
- [ ] {Specific deliverable 1}
- [ ] {Specific deliverable 2}
- [ ] {Specific deliverable 3}

---

## 🧪 **TESTING REQUIREMENTS - What You Should Test**

### **Phase 1 Testing: {Testing Category}**
```bash
# Test command 1
{specific test command}
# Expected: {expected result}

# Test command 2
{specific test command}
# Expected: {expected result}
```

### **Phase 2 Testing: {Testing Category}**
```bash
# Test command 3
{specific test command}
# Expected: {expected result}

# Test command 4
{specific test command}
# Expected: {expected result}
```

### **Integration Testing Requirements**
- [ ] **Test Category 1**: {Specific test requirement}
- [ ] **Test Category 2**: {Specific test requirement}
- [ ] **Test Category 3**: {Specific test requirement}
- [ ] **Performance Testing**: {Performance requirements}
- [ ] **Security Testing**: {Security validation requirements}

---

## 📊 **EXPECTED RESULTS - Success Criteria**

### **Performance Benchmarks**
- **Metric 1**: {Target value and measurement method}
- **Metric 2**: {Target value and measurement method}
- **Metric 3**: {Target value and measurement method}

### **Functionality Validation**
- **✅ Feature 1**: {Validation criteria}
- **✅ Feature 2**: {Validation criteria}
- **✅ Feature 3**: {Validation criteria}

### **Quality Metrics**
- **✅ Code Quality**: {Quality standards}
- **✅ Documentation**: {Documentation requirements}
- **✅ Testing Coverage**: {Coverage requirements}
- **✅ Security**: {Security compliance requirements}

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Pre-Implementation Setup**
- [ ] Create feature branch: `{branch-name}`
- [ ] Set up development environment
- [ ] {Additional setup requirements}

### **Phase 1: {Phase Name} ({Timeline})**
- [ ] {Specific checklist item 1}
- [ ] {Specific checklist item 2}
- [ ] {Specific checklist item 3}
- [ ] {Testing and validation items}

### **Phase 2: {Phase Name} ({Timeline})**
- [ ] {Specific checklist item 1}
- [ ] {Specific checklist item 2}
- [ ] {Specific checklist item 3}
- [ ] {Testing and validation items}

### **Final Validation**
- [ ] **Performance**: {Performance validation}
- [ ] **Functionality**: {Functionality validation}
- [ ] **Quality**: {Quality validation}
- [ ] **Documentation**: {Documentation validation}

---

## 🚀 **READY FOR IMPLEMENTATION**

**All technical research completed ✅**  
**Architecture validated ✅**  
**Implementation roadmap established ✅**  
**Success criteria defined ✅**

**👨‍💻 GitHub Copilot: Please begin implementation following this structured plan!**

---

*Last Updated: {Date}*  
*Document Version: 1.0 - Initial Change Request*  
*Branch: {branch-name}*  
*Status: {Ready for Implementation|In Progress|Completed}*
```

---

## 🎯 **INSTRUCTIONS FOR AI AGENTS**

### **When Creating a Change Request:**

1. **Analyze the Request**: Understand what needs to be changed and why
2. **Research Current State**: Investigate existing codebase and architecture
3. **Define Clear Requirements**: Be specific about what needs to be accomplished
4. **Plan Implementation**: Break down into logical phases with timelines
5. **Specify Testing**: Define clear validation and testing criteria
6. **Set Success Metrics**: Establish measurable outcomes

### **Document Structure Guidelines:**

#### **Clear Headers Structure**
- Use emoji headers for visual clarity (📋, 🎯, 🚀, 🧪, 📊)
- Keep sections logically organized and easy to navigate
- Use consistent formatting throughout

#### **"Hi Copilot" Introduction**
- Start with friendly, direct address to GitHub Copilot
- Immediately state the problem and objective
- Set the context for the entire document

#### **Current Situation (What We Have)**
- **Be Factual**: Describe existing implementation accurately
- **Include Technical Details**: Architecture, tech stack, performance metrics
- **Identify Limitations**: Current pain points or constraints
- **Highlight Capabilities**: What already works well

#### **Requirements (What We Need)**
- **Be Specific**: Avoid vague requirements
- **Categorize Requirements**: Group related requirements logically
- **Include Non-Functional Requirements**: Performance, security, scalability
- **Provide Context**: Explain why each requirement is needed

#### **Implementation Objectives (What You Should Accomplish)**
- **Phase-Based Approach**: Break work into logical phases
- **Clear Timelines**: Provide realistic time estimates
- **Specific Tasks**: Each task should be actionable
- **Code Examples**: Include implementation patterns where helpful
- **Deliverables Checklist**: Specific, measurable outputs

#### **Testing Requirements (What You Should Test)**
- **Provide Exact Commands**: Copy-paste ready test commands
- **Expected Results**: Clear success criteria for each test
- **Multiple Testing Levels**: Unit, integration, performance, security
- **Validation Criteria**: How to verify each requirement is met

#### **Expected Results (Success Criteria)**
- **Measurable Metrics**: Quantifiable success indicators
- **Performance Benchmarks**: Specific performance targets
- **Quality Standards**: Code quality and documentation requirements
- **Completion Criteria**: How to know when you're done

### **Best Practices:**

#### **Writing Style**
- **Be Direct**: Clear, actionable language
- **Be Specific**: Avoid ambiguous terms
- **Be Complete**: Include all necessary context
- **Be Structured**: Logical flow and organization

#### **Technical Content**
- **Include Code Examples**: Show, don't just tell
- **Provide Context**: Explain technical decisions
- **Reference Standards**: Follow established patterns
- **Validate Feasibility**: Ensure requirements are achievable

#### **Project Management**
- **Track Progress**: Use checklists and status updates
- **Set Expectations**: Clear timelines and deliverables
- **Risk Assessment**: Identify potential challenges
- **Resource Planning**: Consider team and infrastructure needs

---

## 📁 **CHANGE REQUEST TRACKING**

### **Numbering System**
- **Sequential Numbers**: Start from 1, increment for each new request
- **Consistent Format**: Always use CHANGE_REQUEST_{NUMBER}_{DESCRIPTION}
- **Branch Correlation**: Each change request should have corresponding branch

### **Status Tracking**
```markdown
## 📊 Change Request Status

| ID | Title | Branch | Status | Created | Completed |
|----|-------|---------|---------|---------|-----------|
| 1 | Initial Setup | setup | ✅ Completed | 2025-09-01 | 2025-09-05 |
| 2 | GPU Integration | gpu-enhancement | ✅ Completed | 2025-09-10 | 2025-09-15 |
| 3 | MCP HTTP | HTTP-MCP | 🚀 In Progress | 2025-09-17 | TBD |
| 4 | {Next Request} | {branch} | 📋 Planned | TBD | TBD |
```

### **File Organization**
```
.github/
├── change-requests/
│   ├── CHANGE_REQUEST_1_INITIAL_SETUP.md
│   ├── CHANGE_REQUEST_2_GPU_INTEGRATION.md
│   ├── CHANGE_REQUEST_3_MCP_HTTP.md
│   └── CHANGE_REQUEST_4_NEXT_FEATURE.md
├── prompts/
│   ├── change-request.prompt.md
│   └── copilot-setup.prompt.md
└── workflows/
    └── change-request-automation.yml
```

---

## 🚀 **USAGE INSTRUCTIONS**

### **For AI Agents Creating Change Requests:**

1. **Read This Entire Prompt** before writing any change request
2. **Follow the Template Structure** exactly as specified
3. **Fill in All Sections** with specific, relevant content
4. **Use the Naming Convention** for file names and locations
5. **Update Status Tracking** when creating new requests

### **For Development Teams:**

1. **Review Change Requests** before beginning implementation
2. **Use as Implementation Guide** throughout development
3. **Update Status** as work progresses
4. **Reference for Testing** and validation criteria

### **For Project Management:**

1. **Track Progress** using the status table
2. **Plan Resources** based on phase timelines
3. **Monitor Quality** using defined success criteria
4. **Coordinate Dependencies** between change requests

---

**Template Version**: 1.0  
**Created**: September 17, 2025  
**Based on**: CHANGE_REQUEST_MCP_HTTP.md methodology  
**Purpose**: Standardize change request creation process