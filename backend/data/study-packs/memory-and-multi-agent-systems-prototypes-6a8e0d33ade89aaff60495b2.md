## High-Level Summary

This portion is part of a lesson on **multi-agent systems** and **memory**. It explains the types of **memory** used in LLM systems. The focus is on **in-context memory**, **external key-value memory**, and **vector memory**.

This part explains three memory types for AI agents. These types are semantic memory, episodic memory, and in-context memory. It also explains how to manage a context window.

This portion explains how to manage an LLM agent's **context window**. It describes three methods: **eviction**, **summarization**, and **external storage**. It shows why eviction is risky and why summarization is common.

This portion shows three strategies to manage a finite context window in an LLM agent: eviction, summarization, and external storage. A 2000 token budget and a 10-step database migration plan show what each strategy gains and what it loses.

The transcript shows how to protect critical information during context management. It compares external storage, summarization, and compaction. It also explains eviction, token budgets, and the use of evals to find strategy errors.

This portion explains how an agent system compacts context to keep token use low. It describes three mechanisms (eviction, summarization, and external DB retrieval) and three memory compression strategies (structured prompts, hierarchical consolidation, and weighted retention).

This portion explains memory management in LLM agents. It covers decay, retention, persistence timing, and user preference tracking.

This transcript explains how to build an evolving working memory for an AI agent. The LLM extracts memory actions from new user messages. The actions are add, upsert, and delete.

The discussion covers a memory extraction toy that stores one subject, verb, and object fact at a time. It explores schema design, LLM versus classic NLP tools, and async updates in production.

This portion explains **multi-agent** architecture and the **orchestrator specialist** pattern. The goal is to know when to split a task across agents, how the handoff works, and what benefits it gives.

The speaker demonstrates a multi-agent research system that uses a scatter and gather pattern. The lead planner splits one topic into parallel subtasks, separate agents execute them, and the results combine into a final report.

The discussion covers how to coordinate multiple agents. A central database acts as the shared state manager. The speaker argues for deterministic workflows and recommends using the LLM for intelligence, not for orchestration.

The transcript covers how to choose between skills and deterministic workflows for agent systems. The team uses skills for orchestration today. It will convert the skills into deterministic workflows when scale and cost matter. The goal is to use the LLM for intelligence, not for routine orchestration.

The critic refiner pattern revalidates and refines an agent output. Mixture of agents combines outputs from many agents. Deadlock between agents must be prevented with limits or supervisor checks.

The objective is to design an **incident auto-remediation system** for outages. The system uses standard system design patterns plus an AI layer to triage alerts and recommend actions for the on-call engineer.

The discussion designs an agentic system that triages IT incidents automatically. It covers the day-zero architecture, the P1 latency budget, and the tools that the agents need.

This portion defines the design rules of an incident investigation agent. The agent must handle LLM capacity, provider fallback, output length, and run book retrieval.

The agent gathers issue information and produces a clear output for the on-call engineer. The output must state the issue, the proposed fix, the queries used, and the relevant history.

This design uses a human-in-the-loop system for incident auto-remediation. An on-call engineer reviews the AI output and runs commands through an executor node with MCP calls.

This portion defines the architecture for an AI system that supports incident remediation and long-term fixes. The discussion covers sync versus async work, command logging, summarization of correspondence, and background agent roles.

This portion covers key design decisions for an AI on-call agent. It explains capacity limits, incident deduplication, human approval for tool actions, loop stopping conditions, and memory recall.

This transcript explains how an agent uses graph queries and retrieval pipelines for incident remediation. It also covers model diversity, prompt management, summarization, and eviction.

This portion explains agent memory techniques such as rolling summarization, hierarchical consolidation, and weighted memory. It also defines the four memory types and shows a demo of a second brain CLI tool.

The transcript describes personal software tools that the author built with help from AI. Two tools stand out: **Brain**, a command line tool for reading, and **Rumi**, a quiz app for his daughter.

A father describes the learning tool he built for his five-and-a-half-year-old daughter. His main goal is to keep her curious throughout her life.

A parent explains how he uses an AI assistant, named "AI Aunty", to teach his daughter science and technology.

His goal is to build her imagination, intuition, and problem solving through prompts, games, and apps. He does not want her to depend on memorization.

## Structured Notes

- **In-context memory** is the context you keep adding to your conversation. It is part of the **context window**.

- In-context memory needs no retrieval. It is literally part of the chat.

- A very large context causes the **lost in the middle problem**. The LLM gives most attention to the beginning and the end of the context. The middle gets less focus.

- A large context has costs. You pay for all tokens. **Prompt caching** loses its benefit. The LLM struggles in the middle of the context.

- You can use strategies to evict parts of the context. This topic comes later in the lesson.

- **External key-value store** memory uses systems such as **Redis** and **DynamoDB**.

- You can store the whole conversation. You can also extract **facts**, **decisions**, and important aspects.

- When the memory grows, you store it externally. You retrieve only the relevant parts.

- Retrieval can use **BM25**, semantic lookup, or **cosine similarity**. A **vector database** can use **HNSW**.

- The retrieved data becomes part of the next LLM call.

- The choice of what to retrieve depends on the use case.

- Example: to find the **rate limit** of a customer, the agent writes a **tool call**. The tool builds a key such as user ID plus rate limit. The tool returns the value. The value is added to the context.

- The **tool description** must state the key format and the way to get the information.

- External memory can hold **user configuration**, **user preferences**, past chats, and key decisions persisted over a long chat.

- The benefit is a small working context.

- The cost is retrieval. The key must be **deterministic**. The query or the **MCP tool** must be deterministic. The **tool definition** and **input schema** become critical.

- Any database that supports vector lookup is also external memory. Vector lookup is covered under vector memory.

- External key-value memory stores **named facts**. You give a key. You get a value.

- Key-value stores are the most popular. You usually do **pointed lookups** such as a **multi-get**.

- Classic **system design** applies here. You must plan database provisioning, availability, and key patterns.

- You must know if you do a **range lookup** or a **pointed lookup**.

- **Elasticsearch** does keyword lookup with **BM25** or **TF-IDF**.

- For Elasticsearch, you choose the **analyzer**, form the query, and set the **ranking strategy**.

- You can re-rank results with a deep learning algorithm inside Elasticsearch. This creates a feedback loop.

- This whole flow is **information retrieval as a token**. The retrieved data enters the context.

- **Vector memory** is the most popular today. It does **semantic lookup** with **cosine similarity**.

- The two forms are kept separate in the lesson. This stresses configurations, preferences, and graphs on one side, and cosine similarity on the other.

- Some databases merge both forms. **Elasticsearch** supports vector lookups. **Postgres** supports transactional queries and vector lookups with the **pgvector** extension.

- **Semantic memory** uses an embedding of a document or a query. The embedding decides what content is relevant to you.

- Every database can act as a **vector database**. You can treat it as a normal database and avoid a semantic lookup every time.

- Do not assume that every **RAG solution** must go into a vector database. Look at the problem statement, understand the flow, and then decide what to do.

- **Episodic memory** stores important facts, important decisions, and a sequence of events. This behavior is close to how the human brain works.

- Use an **LLM** to extract key facts and key events from a conversation. Store them in a system such as Redis, DynamoDB, Postgres, or a graph database.

- The choice of store depends on how you want to query it.

- Episodic memory is a good way to summarize information. For a large chat, you can make an LLM call to summarize it. You can also use a more sophisticated prompt.

- A sophisticated prompt asks the model to log or summarize without losing key facts, key events, and key decisions. This prompt is better than a blind summary request.

- A change in preference is an episodic fact. For example, one person used to like pizza, but now likes a burger. The change happened after trying a burger for the first time.

- There is no generic way to do this. Look at your system and find the events, insights, and decisions you do not want to lose.

- Convert verbose text into embeddings. But extract facts in most cases and query them as structured data.

- Use **vector memory** for high verbosity text that you must retrieve. This is different from structured episodic facts.

- **In-context memory** is the most important type because it directly impacts cost. Your working memory is your main context window.

- What you have in the context is what gets passed into the prompt. The context window has limited capacity.

- Old models had a 100,000 token limit. Many users now use 1 million or 2 million tokens. But some systems still have a smaller limit.

- A large context window does not mean every token gets equal attention. This relates to the **lost in the middle problem**.

- In the lost in the middle problem, the first content and the last content get more attention. The middle content gets less attention.

- One paper says that copying and pasting the entire prompt twice gives a better result. It acts as a forcing function that gives the task enough attention.

- The context window contains several items. These items include the system prompt, tool definitions, user prompts, and model responses.

- The context window also contains file content and intermediate observations. In a reasoning loop, the thinking output becomes text, and this text is added to the context.

- There is no single right way to manage the context. It is not always summarization.

- **Eviction** is one strategy. When the context window is too big, you can remove content.

- You do not always know which content to remove. If you remove the oldest content, prompt caching takes a hit.

- Be mindful of what you evict and why you evict it.

- You can remove reasoning steps after a decision is taken. You can also remove verbose tool outputs after the output is used.

- Research paper example. You give the whole paper to the context. The model reads it and extracts the sections and text. Once this job is done, remove all of it from the context and add one simple bit.

- Subtask example. When a calculation is done, you have the answer. You can remove the tool response because the job is done.

- The biggest problem is that you do not know the future. At step eight, you do not know if you will need the output of step three at step 15.

- **Context window management** is important for agents. The window can grow too large. You must remove old data to save cost and avoid hallucination.

- **Eviction** means you remove parts of the context. You decide which parts you do not need.

- **Eviction risk**: you may not know if a future step needs an evicted result. In step 8 of a process, you may still need output from step 3. Never evict unless you are very sure.

- **Reasoning traces** can help you decide what to remove. You can evict a subtask result once the job is done.

- **LLM trading agent example**: past trades of a stock enter the context. Outdated signals are dangerous. You evict old signals so you can act on the latest ones.

- **Coding agent example**: during a large refactor, you remove a file from context once it is refactored and working.

- There is **no one right answer**. What you remove and how you remove it depend on your use case. Understand your use case well.

- **Summarization** is more general purpose. A summary captures key information, but it is **lossy**. It may skip an important detail, such as a tool call output that you need later.

- Summarization is **usually safer** than eviction. Many people choose it by default.

- Summarization is **slow** because it requires an LLM call.

- **Workplace example**: an agent has 15 steps. After step 5, only step 5 output matters. The first five steps are removed. This saves cost.

- To support eviction, store each message as a **dictionary** instead of a string. Tag each message with its purpose. Use this in deterministic workflows.

- Summarization replaces the whole context with one summary. The chat can then continue.

- **Customer support chatbot example**: the conversation is long. It is mostly chit-chat. Human decisions are few. Summarize and replace the whole context. This saves tokens.

- **Legal discovery example**: you hunt for a similar case that supports your argument. When you find it, you can remove or summarize the earlier steps. The summary has the case, the date, the parties, the verdict, and the supporting argument.

- **Research assistant example**: after research, many exploratory questions exist. Summarize to shorten the window.

- To accept a lossy summary, do three things. One, accept that loss is okay. Two, a summary that is good enough is fine. Three, ask the prompt to capture details it would not miss.

- You can make **multiple LLM calls** to summarize if you are unsure the model might miss things. This trades cost for completeness.

- **External storage** moves data out of the context. This can be a database or a disk.

- **Disk example**: a coding agent creates temporary Python files or test files. It loads them when needed. It may forget to delete them. You can delete them or ask the agent to do it.

- External storage is a form of eviction. You can store key facts in a structured format or store the verbatim conversation.

- The whole idea is to **manage the context window** and keep it simple.

- **Context windows** are finite. An agent must manage them carefully.
- The demo combines three strategies: **eviction**, **summarization**, and **external storage**.
- The demo uses an **artificial budget of 2000 tokens**. The budget can go to 1 million tokens, but the demo limits it to show the behavior.
- The task is a **10-step database migration (DV migration) plan**. The developer mocks many tool outputs.
- The agent plays the role of a **senior database migration analyst**. It receives investigation findings one step at a time.
- The role must note **exact commands, constraints, numbers, and action items**. The agent may need to recall them later.
- **Eviction** uses a **sliding window**. When the current tokens exceed the context budget, it removes old messages from the context window.
- Eviction triggers when the tokens reach **90% of the context budget**. At a budget of 2000 tokens, this is near 1800 tokens.
- **Summarization** replaces the context with a summary. It runs after every five steps and then continues the chat.
- The summarization prompt is **task-specific and prescriptive**. It states exactly what matters to the task.
- The prompt must preserve **exact commands, numbers, table names, constraint names, procedures, breaking changes, and actionables**. A generic prompt would skip this detail.
- The prompt uses **extreme abbreviation**, a **maximum of 100 words**, and the rule that **every token must carry information**. The developer adds these settings on purpose to show the lossy behavior.
- **External storage** keeps the data in **ChromaDB**. The agent uses **semantic lookup** to find relevant parts. The query states the text and the number of results wanted.
- The retrieved context becomes the next user message.
- The demo records the **token count for each of the 10 steps**.
- Summary sizes grow across steps (for example, 250, 428, 591, 988, 1213). Both eviction and summarization shrink the context window.
- A **recall test** asks about the eviction phase and the summarization phase.
- **Eviction is lossy**. The recall cannot find the evicted information.
- **Summarization is lossy**. The recall cannot find the summarized information.
- The goal is to make sure the strategies do not lose data. **External storage and retrieval preserve the data**.
- A **503 error** interrupted one run because the Gemini service was down. The developer advises saving output always as a fallback plan.
- A **terminal output skill** renders the code output in a clean form.

- **Context management** decides what stays in a conversation window.

- **Critical information** includes exact commands, numbers, and table names. This information must not be lost.

- **Evals** are tests that find errors. You use them when someone changes the eviction strategy or the context management strategy.

- **External storage** can retain critical facts. Example: **Chroma DB**. In the test, the query found the rollback command in Chroma DB and produced correct output.

- **Rollback command**: the exact command is documented in the initial schema analysis.

- **Rollback time window**: for SARS post migration, wall segments are purged after that period.

- **Token budget** and **context budget** control the size of context. A best guess is often enough.

- **Token counting**: count the words in the text. Do not make a network call for exact counts.

- A rough token estimate is fine. Being off by 100 to 300 tokens is not a problem for summarization.

- **Summarization** shortens historical messages.

- **Compaction** is the strategy an LLM agent uses to compress a session. Example: the Claude agent tool loop.

- **/compact** runs compaction with the default prompt.

- **/compact with a prompt**: add a custom prompt, for example "always remember X and Y facts". Compaction then focuses on that information.

- The default POC prompt preserves only critical facts, exact commands, numbers, and table names.

- In the R flow, summarization and compaction work with any model. You control how they run.

- **Eviction** removes old messages from the context.

- A **sliding window** strategy can evict the system prompt. Make the strategy smarter. Keep the first three messages, which hold the system prompt and the task.

- **Good practice**: keep the system prompt in one array. Keep conversation messages in another array. Concatenate them for the next prompt.

- **General purpose agents** are hard to evict for. You do not know what is important. This is why frontier labs start with summarization.

- **Sonnet vs Opus**: the docs say Sonnet does not support compaction. This claim is uncertain. Treat it as false by default. Summarization is only historical messages, so it should be easy.

- **Eviction** removes context when usage reaches **90%** of the budget.
- In this session, usage never hit 90%. No eviction ever triggered.
- Because no eviction happened, the context was retained. The output stayed **non-deterministic**, and different outputs were possible.
- **Summarization** was requested every fifth step.
- The summary shrank from **1000 tokens** to **220 tokens**.
- The summarization prompt asked for **dense** output. It also said "every token must carry information".
- That dense instruction forced very short and abbreviated summaries. Exact commands were lost.
- **External DB** stores every message. After each output, the message goes into the database.
- Before each run, the system queries the database for relevant documents and passes them into context.
- This fetch happens on every step except the first step, because the database is empty at that point.
- This is the **retrieve everything and then run** pattern.
- The **memory compression prompt** is similar to the summarization prompt. It adds an explicit **output format** for the specific use case.
- The output format can capture decisions, metrics, or numbers depending on the use case.
- **Hierarchical memory consolidation** usually uses a **graph database**.
- During conversation, the system extracts **decisions** and **open items**.
- In an agentic SDLC system, open items become Jira tickets.
- Do not create tickets during the conversation. Create them at the end, after **human review**.
- This structure also helps note-taking apps and meeting summaries.
- A structured meeting summary shows **next steps**, **who said what**, and **key decisions**.
- **Weighted retention** mimics human memory. Humans do not keep all memories equally.
- **Recent information** is more important.
- Memory decays with an **exponential decay** formula: weight follows **e to the power of negative x**.
- When the weight goes below **0.001**, the information is forgotten.
- The decay never reaches zero exactly. It only drops below the threshold.
- A **personal assistant** is a good use case because preferences change and memory evolves.
- Example: a person liked Java, then worked with Go, and now likes Go more. The Java preference is eventually forgotten.

- **Exponential decay** means a memory loses weight over time. If a user liked Java then Go, the agent reports Go later.

- The decay mimics human behavior. Decay is not universal. Some memories remain forever.

- **Critical events** must stay remembered. Examples are a marriage and the birth of a child.

- The LLM prompt decides what is critical. The prompt flags important facts for the agent.

- **PageRank thesis**: a memory's weight increases with reference frequency. Linked memories gain higher attention. The speaker has not verified this idea.

- **LFU or anti-LFU approach**: high access frequency marks importance. Access frequency below a threshold in a time window triggers removal.

- An explicit command, such as "please remember this", sets a memory to remain forever.

- **When to write memories**: after every five steps, the agent writes memory to external storage. The agent can also persist, compact, or summarize.

- **What to persist**: not every decision or conversation is important. Noisy memory has a high cost.

- Noisy memory causes context bloat and reduced precision. The **SNR (signal to noise ratio)** degrades.

- Degraded retrieval becomes irrelevant and possibly contradictory. Bad output can result.

- Rule of thumb: persist only decisions that change agent behavior or future agent execution.

- For a personal assistant, persist **user preferences**.

- **Append vs replace**: "I like pizza" then "I like burger" is an append. "I used to like pizza but now I like burger" is a replace.

- The choice depends on the older state of the memory and the new information.

- **Canonical keys** must be descriptive and verbose. Use "preference", not "pref". Example key: **user_USER_ID_preference_food**.

- Tag each memory with **task ID** and **agent ID**. Tags support observation and debugging.

- Debugging answers why a memory got corrupted or replaced.

- **Memory startup pattern**: many startups blindly call the LLM to find important facts.

- Demo flow: the agent computes memory actions. The LLM extracts keys and outputs operations.

- Example: the user says "I am Arpit, I am an engineer from Bangalore". The key extractions are: Arpit works as engineer; Arpit lives in Bangalore.

- The LLM outputs **operations** such as upsert. Here is the important rule: operations are worth highlighting.

- If the user later says "I live in Gurgaon", the system performs an update, not an append.

- **Model deprecation**: models can become deprecated or unavailable. Have evals in place. Change code when the provider sends a notification.

- **Working memory** is a store of facts that an LLM extracts from user messages over time.

- The LLM works as a **memory extraction engine**. It analyzes a user message and derives memory actions.

- The three action types are **add**, **upsert**, and **delete**. Add creates an entry. Upsert updates an entry. Delete removes an entry.

- The LLM decides the action type. The relation verb in the message guides the decision.

- "Works as" describes a current state. A change to the role is an upsert, not an append. The new role replaced the old one.

- "Lives in" is a current state. When the user does not mention a new city, the entry stays as is.

- "Codes in" is an addition use case. A user can code in many languages. So "codes in Python" and later "codes in Rust" form two entries. The system does not replace a previous entry.

- A meeting date can change. Changing the date is an upsert. Other entries stay the same.

- A meeting participant can change. Changing "meeting with Sam" to "meeting with Sarah" is an upsert.

- When the participant changed, the meeting place stayed the same. The user never mentioned a new place. The system kept the old value.

- External data can replace memory. For example, a scheduled Google Calendar invite can flood in and replace a meeting event.

- The agent applies actions to a structure. The structure is in memory. It is a list, not even a graph, despite being called a graph.

- The agent does a **linear scan** of the list. It finds the matching entry and replaces or adds it.

- A real system can write memory to a **graph database**. Retrieval can use a Cipher query. The demo uses a list only for simplicity.

- A memory entry uses a three-tuple format. The tuple has a subject, an object, and a verb. This is a graph relationship, not a SQL table.

- The prompt has critical rules. The agent must not fix or reconcile with current memory. It must only extract actions from new user messages.

- The prompt defines when to use add and when to use upsert. It cites examples such as lives in, works as, current state, likes, and has skills.

- The prompt asks for **crisp uppercase relations**. A uniform relation format makes duplicate detection easy. Without it, the system produced odd variants from words in the user text.

- The prompt asks the agent to respond only with a valid JSON object. JSON was used because it was easy to write.

- The output schema can instead be passed to the model as metadata. The model respects that schema.

- To save cost, do extraction in batches for a set of commands. Use a weaker or cheaper model. Do not run extraction on every conversation.

- Extraction can be combined with **named entity recognition**. This makes the system more CPU bound and less LLM bound.

- Most memory AI startups do this work for every conversation. Some heavily funded ones did so and were called out.

- Do not build a general purpose agent. Build an agent for a specific use case. Give it relevant examples as a prescription.

- The method is error prone. It can remove entries that should stay.

- For example, "I am also meeting Pratik" caused the system to remove Sarah from memory. A later instruction to keep Sarah produced no action.

- The transcript closes by noting this approach is not a silver bullet and not for bigger systems.

- The system stores **current state**. It keeps one value at a time.
- If the user mentions a new value, the system **replaces** the old one. This is the **UPSERT** behavior.
- **Relations** are a fixed, limited set. Define all relations with an **enum** data type in Pydantic.
- The LLM receives the same schema. It then knows the relation set is fixed.
- Link each memory to the **text** that produced it. This supports auditing and debugging.
- Store the **chat ID** with each memory. The chat ID tells where the memory came from.
- Use classic NLP tools such as **spaCy** for named entity recognition. Use them only for well-formatted, legit English text, such as news articles.
- LLMs are better when input has uncertainty. Human agents write in different languages and informal styles in one chat.
- Prefer classic ML, DL, and NLP strategies when the input fits what the tools expect.
- Tuple extraction is a solved problem for good English text. Pronoun disambiguation is also a solved problem.
- Startups that call an LLM on every chat message face cost criticism.
- In production, the conversation goes into a database first. A **CDC pipeline** consumes events, extracts, and updates asynchronously.
- Extraction does not need an **agentic loop**. Use a separate model outside the in-context window.
- Ask the LLM to output an **RDF tuple** with subject, object, and verb. This format is easier for the LLM to generate than a query.
- **Evals** show the importance of testing. They help explain why a bug happened.
- **Memory tools** in the market do the same task. They extract from five or ten messages and filter by token budget.
- **Multi-agent** is a simple idea. One agent could not do things. Multiple agents might do things.

- **Multi-agent** means many single agents running in parallel. It is not one complex agentic loop.
- Treat **multi-agent** as a **microservices** architecture. Each service does one task well.
- Each service can use its own **architecture** and its own **database**. In this analogy, **architecture** is the agentic loop and **database** is the model.
- A **monolith** is a single agent with a large context. It is good enough for most use cases.
- Use **multi-agent** when a task splits into subtasks that can execute in parallel. Use it when the subtasks are independent. Use it to speed up work.
- Use a **specialized model** for one problem. Example: plan with Opus, execute with Sonic.
- Pick a model for its strength. Example: use Gemini for English text, use another model for multilingual output.
- Pick a model for context length. Use one model for a long context. Use a different model for other tasks.
- Give each agent **single responsibility**. Example: one agent handles refunds. One agent handles shipping. One agent plans. One agent writes Go. One agent writes Java.
- In a monorepo with Go and Java changes, use a Go review agent for Go code. Use a Java review agent for Java code.
- The **orchestrator specialist** pattern is the most likely pattern for building **multi-agent**. It is not the only one.
- The **orchestrator** is the main LLM task. It splits the task into subtasks. It hands each subtask to a specialist agent. It waits for the response.
- The specialist runs its own **agentic loop**. It does multi-step reasoning. It writes one final output.
- The final output goes to the orchestrator. The orchestrator does not receive every message. It receives only the output.
- A handoff is not a tool call. A **tool call** is an external call to a system. A **handoff** runs a full agentic loop.
- The orchestrator tracks all results. It decides what to do next. It can make tool calls. A sub agent can also make tool calls.
- Example: **customer ticket triage**. The main agent receives a ticket. It decides the ticket is payment related. It hands the ticket to the payment agent.
- A **handoff** can create a sub-process. It can be a separate file, a separate thread, or a separate go routine. That process runs an agentic loop and returns the output.
- For a separate model, use a separate go routine with its own context window. This is better practice.
- Example: **incident triage**. A metric agent has access to metric tools only. A log agent analyzes large text and narrows down the bug. A source code agent finds key code pieces.
- **Tool isolation** is a benefit of **multi-agent**. The metric agent should not have access to log tools. Each agent gets only the tools it needs.
- Example prototype: a **deep research agent**. The **lead planner agent** is the orchestrator. It runs specialist agents for a research topic.

- **Scatter and gather** is the core pattern. Independent processes do their work, and then the system waits for all outputs.

- The system has four agent roles: the **web search agent**, the **concept specialization agent**, the **research critic agent**, and the **lead synthesizer agent**.

- The lead planner agent creates all subtasks first. Then it assigns each subtask to a matching agent.

- The planner output is a **Pydantic model**. Each subtask has a **title**, a **description**, and an **agent type**.

- The **agent type** is either **web search** or **self-knowledge**.

- **Self-knowledge** covers theoretical concepts and fundamental physics.

- The planner prompt asks for two to three distinct subtasks. The subtasks must be complementary. They must not overlap.

- For each subtask, the planner decides if self-knowledge is enough or if web search is needed.

- The system uses **asyncio**. It appends each subtask as a task. Then it uses **gather** to wait for all tasks.

- **asyncio.run** calls the main function. This function gets all tasks and gathers them.

- The system waits until all tasks are complete. Then it proceeds to the next step.

- After gathering, the system runs the **critic**, then the **synthesis**, and then it **generates the final report**.

- The critic prompt says to review the parallel reports and find gaps and conflicts.

- The critic conducts a **cross-report gap analysis and audit**.

- The sub processes run independently. They do not share conversation context.

- The orchestrator must not look into the work of a sub agent. It only cares about the output.

- Sub agents do not have access to the orchestrator conversation.

- On one machine, **shared memory** transfers the output.

- Across machines, the system uses a **shared database**. Workers poll the database for work. Each worker picks up a task and forks off a process.

- **Temporal** and **Airflow** use this polling model. Any machine can pick up a task independently.

- An eight-way handoff is not yet mature. Most people use a **shared state**. They want observability, state management, checkpoint, and resume.

- Use **agents** when rounds of communication are needed between agents.

- Use **skills** in the same agent when rounds of communication are not needed.

- The **agent SDK** runs the loop implicitly. It runs the loop on your behalf. You pass the skill file to it.

- A **multi-agent system** in a toy example shares a **common state management layer** on one machine.

- In a **distributed setup**, the system uses a **central database** as the **state manager**.

- Each agent runs a regular Python loop to poll the database. The loop asks whether a task is available. This poll is not part of the agent tick loop.

- An **orchestrator** can call a tool that waits for all subtasks to complete. The tool loops and checks the database until all subtasks finish.

- The orchestrator runs a loop and creates subtasks. It can run a loop. It can also make one LLM call and finish.

- A **poll mechanism** uses a database query. A loop with sleep 1.0 is a classic short polling example.

- Short polling builds a **distributed job scheduler**. You can replace this loop with **Temporal** or an **Airflow DAG**.

- A complex workflow can run in a **distributed fashion**. Different **worker pools** can execute tasks. Each worker pool can be an **agent worker pool**.

- Independent agents are also Python code. Each one needs to know where to persist its state.

- There can be **interdependencies** between sub-agents. A **DAG** captures these dependencies.

- The final system of the course is a **natural language workflow engine**. It can scatter, gather, wait, and fork multiple tasks.

- **A2A (Agent2Agent)** is a protocol from Google. The speaker finds it buggy and not mature. In a same-machine handoff, you do not need it.

- **Temporal**, **Airflow**, and **NATN** are the preferred choices for workflows. They are more deterministic, more reliable, and easier to use.

- Always try to create a **deterministic workflow**. You know what a task does. Code the task in Temporal. Do not make it generic and decide at run time.

- If you must wait for all subtasks, write a while loop. Do not use a tool call. Do not let the agent decide. This saves tokens.

- **Determinism** is needed for **production workflows**. You cannot give an **SLO (Service Level Objective)** to an endpoint if one agent can spin 10, 100, or 1000 agents.

- The **robustness** and **reliability** of the system are in your hands. You are accountable for the result. You cannot let the agent decide what is correct.

- The rule is **use the LLM for intelligence, not orchestration**. If the task is fixed, you know exactly how it must execute.

- The **Agent Studio** at Razorpay is an example. Two months ago, the team tested generating a deterministic workflow from natural language. They generate code for each task. Merchants need consistent behavior on every run.

- The market will move toward deterministic parts. People will use the LLM for less of the overall orchestration, no matter how much loop engineering appears.

- Toy systems are far away from **production systems**.

- **Deterministic workflow**: a flow with one path for each input. It never spawns many agents at a decision point.

- Example flow: call an agent to identify the user's language, then call the matching language agent. The path is always fixed.

- A deterministic workflow can have several branches. At each decision point, the flow chooses one available option.

- The flow behaves in one of a few ways. The number of possible behaviors equals the number of available agents.

- Current state: all Agent Studio workflows are skills. The team does not optimize for cost today.

- Skills work well when the workflow is simple and deterministic, and the user accepts a few extra tokens.

- Skills make go-to-market faster. The model's intelligence handles the orchestration.

- The abandoned cart workflow is a current example. A user adds a product, goes to Razor Pay, and does not complete the payment. The system calls the user, negotiates, and recovers the payment.

- The abandoned cart workflow runs periodically from a skill. The skill decides who to call and how to negotiate.

- Skills mature as the team gets more customer requirements.

- Cost becomes important at scale. With millions of merchants, the cost will grow. The team will convert skills into deterministic workflows at that point.

- In production, the team will make LLM calls only where these calls are essential.

- Rule: start simple and evolve. Always know how to convert a skill into a deterministic workflow.

- Rule: use the LLM for intelligence. Do not use it for routine orchestration.

- Orchestration can move to dedicated platforms such as Temporal, Agno, or other tools.

- The team currently uses the Agent SDK in production. The product is at MVP stage.

- The Agent SDK makes skill iteration easy. You write instructions in English and rely on the model for orchestration.

- LLM-driven orchestration is costly at scale. Example: an LLM call to decide a five minute wait is not needed. The workflow should know the wait time directly.

- An Agent SDK workflow can generate Temporal code. The workflow is Python code at the core. A decorator generates the Temporal code.

- A human in the loop validates the generated code once. Then the code becomes the production part.

- **Agno**: a framework that creates an abstraction to build agentic workflows. The team built a prototype with Agno.

- **Agent fabric**: a middle path framework. Multiple agents register in an **agent catalog**.

- The agent fabric selects an agent at run time for each decision point.

- Dynamic selection still stays deterministic. The agent set is fixed, and one agent serves each request.

- **Critic refiner** is a pattern similar to orchestrator specialist.
- It revalidates and critiques an agent output, then refines it if needed.
- A main agent writes an output, for example an article or a deep research report.
- A **critic** reviews the output of the main agent.
- The critic finds flaws, for example wrong format or factual errors.
- A **refiner** refines the output based on the findings of the critic.
- The refiner is the doer. The critic checks the work.
- The critic can run its own loop. For example, it can do a web search to check facts.
- In an **SQL query optimizer**, the critic finds slow queries and the refiner optimizes them.
- The roles can overlap. Sometimes the critic also refines and the refiner only validates.
- This pattern is similar to a fact-checking system from the first week.
- Instead of self-knowledge, the critic makes tool calls and does a web search.
- Use critic refiner when correctness is more important than speed.
- The extra loop costs time, tokens, and money. Use it only when correctness matters most.
- **Mixture of agents** gives the same task to multiple agents.
- For example, three deep research agents use Kimi, Claude, and Gemini.
- Each agent produces an output.
- A **synthesizer** phase combines all outputs into the best version.
- You can add a critic refiner on top of the synthesizer.
- You can pick the best output or combine all outputs into one report.
- This mixture is expensive. It is used mainly by teams with large budgets.
- If the output is good enough, you do not need it. **Eval** decides what is good enough.
- **Deadlocking agents** can occur when multiple agents hand off work.
- Agent A sends output to agent B. Agent B must send work back to agent A. The loop never ends.
- Example: a refund agent and a shipping agent.
- The refund agent escalates a damaged item to the shipping agent for fault confirmation.
- The shipping agent confirms a refund with the refund agent before logging a shipping fault.
- The two agents are owned by two different teams.
- The result is an endless handoff loop.
- To fix it, cap the number of iterations for any loop.
- Or add an explicit **convergence criteria**. For example, block, cancel, or return after two tries.
- Or decide a default answer, for example assume the refund is approved.
- Or add a **supervisor agent** that monitors the other agents.
- The supervisor polls the database for the ticket and the delegation log.
- The supervisor makes a simple LLM call to ask if a deadlock is possible.
- Or it checks the log deterministically for a cycle.
- It short circuits the ticket resolution when a deadlock appears.
- Be mindful when agents are distributed and owned by different teams.
- Keep the solution simple.

- The system handles outages. It builds the first set of triages before the on-call engineer arrives.
- The **triage report** gives steps and commands for the on-call engineer. The report must be self-contained. The reader should not look for other information.
- **Remediation action** and **verification** are the most important parts of the system.
- A human executes the actions first. Later, **agents** act automatically for high-confidence triage only.
- **LLM** output is **non-deterministic**. It is subjective to interpretation. So prompts must be **unambiguous**.
- The solution uses classic patterns with AI tools such as **RAG**, reasoning, and an **agentic loop**.
- **Functional requirements**:
  - The system receives alerts from tools such as PagerDuty, Zen Duty, and Incident IO.
  - Alerts arrive through a **webhook**. The webhook is the injection point.
  - Each alert must include the **priority** of the incident. Without priority, all alerts become equal.
  - The system must define the **incident lifecycle** as a state machine. Example states are snooze, retried, reappeared, in AI triage, and human approval needed.
  - The state machine must match the organization. Do not copy the flow of another system.
  - AI must **augment**, not replace, the existing workflow. A team cannot change its workflow overnight.
  - A tool that forces a new flow becomes a forced adoption and never leaves the pilot stage.
- **Non-functional requirements**:
  - Steady state is **5000 alerts per day**.
  - The **time to first action** at P99 is 90 seconds for a **P1** incident, 5 minutes for a **P2** incident, and 15 minutes for a **P3** incident.
  - There are 86400 seconds in a day. The average load is below one alert per second.
  - The **peak** load is about **1 to 2 alerts per second**. A peak follows cascading failures when one system goes down.
  - Notification tools send raw events. Grouping reduces repetitive alerts, but the system still receives those events.
- **Citation design**:
  - Each claim in the triage report should carry a **citation**. The citation shows where the agent got the information.
  - The reader flags outdated citations. This becomes the **feedback loop** into the system.
  - A complete report improves the engineer's understanding of the failure.

- **Alert grouping**: Systems must group related raw events into incidents. This saves tokens and compute.
- **Alert volume**: The system gets 5000 alerts per day. Peak alert flow is about 50 alerts. Grouping reduces this to about 3 unique incidents. The worst case is about 30 incidents per runtime.
- **Priority splitting**: Sort alerts by priority into different Kafka topics. Run executors per priority.
- **Day-zero architecture**: PagerDuty sends a webhook. Kafka ingests the alert. An executor runs the agent loop.
- **SLA**: A P1 incident has a 90 second window to output a triage. The average latency must stay within 30 seconds.
- **Executor inputs**: The executor needs logs, metrics, code references, opdocs, and memory of past incidents.
- **Metrics**: A Grafana alert carries the failed dashboard. The agent goes to that dashboard.
- **Code**: The reference points to the GitLab or GitHub repository.
- **Logs**: The alert names the pod or namespace. The agent opens the related deployment.
- **Memory**: The system stores memories of past incidents. It uses them for similar future incidents. It also improves opdocs and runbooks.
- **Deployments**: Most incidents follow a recent deployment. The first remediation step is a rollback.
- **Outputs**: The executor writes back to PagerDuty comments. It sends Slackbot messages to the incident channel. It creates or updates a Jira ticket.
- **Incident database**: A database holds the incident ID, description, Slack thread, PagerDuty ID, and Jira ticket number. The agent uses tool calls to add correspondence.
- **Reasoning trail**: The system keeps a reasoning and debug trail. This gives observability.
- **Memory store**: A separate database, such as **Postgres with PG Vector**, stores memory. Use it later to improve opdocs and runbooks.
- **Self-monitoring**: The system needs its own alerts. If the queue grows, the response time targets may break.
- **Latency budget**: In 30 seconds, one agent can make about 5 sequential LLM calls. Parallel calls are quick and unlimited in count.
- **Agent design**: Use specialized agents, one for logs, one for metrics, and one for code. They run in parallel. Each stays within 5 to 8 iterations.
- **Capacity**: Five sequential calls times three parallel agents gives about 15 parallel LLM calls per incident.

- The system must handle 10 to 30 incidents per second at peak.
- The peak rate is about 150 LLM calls per second.
- This number sets the top-level LLM rate limit for the provider.
- Some interleaving happens because each LLM call spans a duration.

- The alerting system itself must stay up.
- At Amazon, an outage made the alert system unreachable. That is a problem.
- The agent loop must not depend on one model. It must span at least two providers.
- If Gemini is down, the system needs a fallback. It cannot say that it cannot fix the issue.
- LLM uptime matters as much as infrastructure uptime.
- Use a separate account or a separate key for the LLM. This depends on the contract with the provider.
- These decisions form the harness. The harness must be reliable and robust.

- The system handles 10 incidents in parallel, maximum.
- Database capacity is not a concern at this scale.
- Limit the number of agent steps. The agent cannot go beyond 5 steps.
- The step limit is very important because it also limits the number of LLM calls.

- The output goes to the on-caller. The on-caller reads it in the Jira UI.
- The output must be crisp and short. Long text takes time to read.
- Give this sequence: what happened, the fix command, then the next steps. Add hyperlinks.
- Verbose output is bad. By the time the on-caller reads it, the incident is gone.
- The prompt must say that the posted output cannot be too verbose.

- The investigation doc records the 5 steps the LLM ran.
- This doc is not a run book. Run books have predefined steps.
- Do not show every reasoning step to the on-caller.
- The on-caller woke up at night. They want to fix fast and go back to sleep.

- For the first triage report, the agent collects responses from many agents.
- It decides which alerts are actionable. It groups alerts and does deduplication at this level.
- The executor checks code, metrics, and logs.

- There are thousands of run books. We need a map of them.
- The map stores which alert types point to which run books.
- A run book may not have the answer. Another run book may have it.
- Do not rely on one run book alone.
- An organization can start with zero run books.
- A fresh issue may have no run book tag.
- This is an open-ended retrieval problem.
- Use a RAG system. Index all run books in a vector database.
- The agent makes a RAG call to get relevant content.

- The agent gives a brief **issue description** and the **potential remediation**.
- The agent shows how it found the information.
- The agent reports the **log query** it ran to get the data.
- The agent points to the specific **run book** it used.
- The agent provides the **past deployments** for the service.
- The **language model (LLM)** reasons about time. A deployment from last week can affect today. A deployment from two weeks ago cannot.
- A **feature flag** can change behavior today even when the code is old.
- A flag turned on today goes live to all users today.
- The agent must include the **feature flag audit history** for the service.
- A service needs metadata in a **consumable format**.
- The relevant metadata is the feature flags for the service and the flags used in the deployment.
- A rule: the agent is as good as the information it receives.
- Better information in a better format makes a smarter agent.
- The **on-call engineer** does the remediation.
- The agent may auto-remediate **low-confidence, low-severity** issues from history.
- **High-priority systems** always need the on-call engineer.
- The AI assists the on-call engineer. It does not replace that engineer.
- A code fix becomes a **pull request (PR)**. A human reviews the PR.
- An incident can be a **subsystem fault**, not a code fault.
- Subsystem faults include **database config changes** and **feature flag reversal**.
- A config change can be a PR-driven change.
- Do not give the agent an **MCP tool** that can flip any config bit. That is a risk.
- Everything the engineer needs must be ready when that engineer arrives.
- Use a **semantic lookup** or **cosine similarity** to find similar past incidents.
- **Memory** is the record of past incidents and the steps the agent took.
- Two run book types exist: a **remediation run book** and a **past incident record run book**.
- Past incidents give the agent a **guiding light**.
- Past records carry **partial weightage** only.
- The agent still runs a **reasoning loop**.
- The agent can take a different path when the situation is different.
- Past steps are guidance. They are not a forced path.
- The second important output part is the **format or style of triage**.

- A **critic node** adds its correspondence to the workflow. You add a critic when you want a more sophisticated system.
- The system first finds the **root cause**. Most of the work is handled by the on-call engineer.
- The AI does not execute directly. The design uses **human-in-the-loop** execution.
- The Jira correspondence has a **run button**. Press the button to run the given command.
- The run button makes an API call. It sends an **MCP tool call** to an executor.
- The **command executor** has connectivity to K8s, AWS, internal feature flags, and other subsystems. It runs the commands.
- A command can be a **shell command**. It can also be a single **MCP tool call**.
- The executor abstracts the **SSH connection** to a server through a bash tier. It fires the command and gets the response.
- The executor can fire commands on a deployment tool. It can also fire commands on other systems, such as an auto scaling group.
- You can select text and say "run it". The command goes through MCP and the executor runs it.
- Example: to delete an auto scaling group, the **incident auto-remediation agent** asks which group. You paste the group ID and say "delete this one". The system makes a tool call, waits for human action, and then runs it.
- This makes the life of the on-caller easier. The on-caller does not click through the AWS console.
- The system calls multiple MCP servers. It finds the multiple actions with a **reasoning step**.
- The on-caller is a professional. A pro decides if the command is correct and then takes the action.
- This is a good example of why MCP makes life simple. It counters the idea that "MCPs are dead and CLI is everything".
- Start small. Solve one problem at a time. Keep the command output correct. Build the **critical loop**, then enhance.
- This is a high-level overview of an **incident auto-remediation system**.
- Next week's evals will be system design heavy. The two systems are a **code reviewer** and a **self-updating AI documentation system**.
- The documentation system detects **doc drift** between docs and the API. It fixes the drift and gives the docs structure.
- The Sunday session will discuss one big system.
- Content not yet covered moves to the appendix. The appendix will cover **cost attribution**, **open telemetry**, and **regression harness**.

- The team discussed whether work should run **synchronously (sync)** or **in parallel**.
- Most design conversations ask which parts go **sync** and which parts go **async**.
- The goal is to cover the **widest range of topics** in the architecture decision frame.
- **Postmortem generation** is a component. It closes the loop after an incident.
- Postmortems are typically **painful and time consuming**. AI can help generate them.
- A postmortem needs **correspondence, triage, memory**, and it needs to generate the postmortem document.
- An **AI triage** begins the process. A **feedback loop** is required because a human stays in the loop.
- The command execution goes through the **Model Context Protocol (MCP)**.
- A **command execution log** provides a central place to record all commands for an issue.
- If a user executes commands, the user should write them in the comments. The central log is a fallback.
- **Jira integration** was discussed. The Jira ID holds the description and the comments.
- **Chunking** means to split long correspondence into parts. **Summarization** means to condense it.
- Jira comments can be too long for one context. This happens when a ticket moves between teams.
- The discussion splits work into two phases: **incident remediation** and the **long-term fix**.
- For incident remediation, the focus is on **fixing the issue** during the outage.
- For support work, **summarization** is the right approach. It uses the Google Meet Gemini notes model.
- The summarizer works in **five-minute chunks**. It extracts actions, open items, and assumptions.
- The summarizer keeps **updating the document** until it creates the final summary document.
- A **background process** runs phase two. It runs until the ticket reaches a terminal state.
- A terminal state can be **"AI triage complete"** or **"out of outage"**.
- The state "out of outage" means the issue is remediated but the long-term fix is not yet done.
- Running background agents has a **cost**. Run a component only if it adds value.
- A **critic agent** often gives low value. People tend to ignore AI review comments, just as they ignore AI code reviewer output.
- The design splits responsibility into **real-time** and **non-real-time** use cases.
- **Real-time** means during the outage, typically inside the service level agreement (SLA), within the first 90 seconds.
- **Non-real-time** means after the outage and beyond the SLA window.
- One agent can serve **on-call**, and another can serve **support** channels.

**Capacity planning**

- A four core machine handles about four incidents.
- Each incident uses some CPU, so each incident gets a dedicated CPU.
- A high incident count adds memory load.
- The context window can also grow too large.
- The agent helps during crisis time, so it must not go down.
- Add buffer to prevent failure.
- If cost is a factor, set eight incidents per machine.

**Incident grouping and deduplication**

- A service issue can affect its upstream and downstream services.
- Share active open incidents for a team with the LLM if the number is low.
- The first iteration used short circuit evaluation executors.
- This reduced possible findings from 900 to 225.
- The agent must decide if a new incident is related to an existing one.
- A primary incident can cause a secondary incident.
- The same service can raise different incident types.
- Do not assume that different services have related incidents.
- An incorrect match can hide a real issue.
- Someone must still look at a hidden issue.
- Use deduplication or grouping within a surface.

**MCP tool calls and human in the loop**

- The chat uses MCP to change infrastructure.
- An LLM gives a recommendation, for example, increase instances by 30.
- A specific MCP tool changes the instance count in an auto scaling group.
- The tool input has the auto scaling group and the desired instance number.
- The LLM generates the arguments for the tool call.
- The LLM can convert the number incorrectly. It can say 25 instead of 26.
- Use a human in the loop to approve the argument.
- The human can change the number on the fly and then run the call.
- This is a deterministic approach.
- An access group gives the human permission.
- No agent can execute these tools.

**Stopping conditions**

- Phase one returns findings within up to five iterations.
- Phase two digs deeper into the findings.
- The loop needs a stopping condition.
- Stop at the point of diminishing return.
- Stop if the loop is stuck in a cycle.
- Stop if the loop breaches the SLA. For example, stop at twice the SLA.
- At that point, the on-call is already fixing the issue.
- This is a continuously improving system. Start small, observe, then modify.

**Memory recall**

- The agent keeps an evolving memory. Example: "I am going to meet Sam and Sarah."
- Recall uses a graph query.
- The graph schema has node types and a node ID format.
- Do not give a free hand to the LLM for relations.
- Limit the number of relation types per use case. Examples: works, lifts in.
- A limited relation set makes a cypher or graph query easy to craft.

- **Graph queries**: The agent matches user data with nodes and relations. A date node and a user node connect through a meeting relation. The agent builds a query for people you meet on a date.

- **Query creation**: **LLMs** are good at creating **Cypher queries**. The agent receives context such as node types, node ID format, and defined relations.

- **Summarization**: The agent creates a summary every five turns. The process removes five old turns and adds the summary. The summary uses the **user role**, not the assistant role. The summary continues the conversation.

- **Eviction**: The agent removes five turns during eviction. Summarization also removes five turns and adds the summary in their place.

- **Executor connection**: The executor connects to a **Postgres** database. It uses memory plus state management. No runbook is used here.

- **Runbook index**: The agent has a fourth tool called **query runbook index**. This tool calls a vector database. It fetches relevant runbooks. It uses a **RAG pipeline**. The RAG pipeline keeps the vector database updated.

- **Runbook query**: The prompt must be clear. It tells the agent what runbooks exist. It can include a list of runbooks or their types. This lets the agent build a matching query. Each direction has its own level of sophistication.

- **Chain of thought**: **Chain of thought (CoT)** is not the same as reproducing a loop. Mimicking CoT formed a workflow. It overlapped with earlier sessions about loops and memory management.

- **Model diversity**: Output varies from model to model. One prompt does not always work for all models. **Gemini** requires explicit prompts. **Claude** accepts vaguer prompts.

- **Two solutions**: Option one is a separate agent with a query crafted for each model. Option two is a **prompt registry**, also called a prompt repository. One column of the registry can be the model name. The registry can hold the prompt template, its variables, and the tested model version.

- **Evals**: With good **evals**, you can test one prompt on multiple models. This works only if no single model output degrades. A prompt repository is usually better than one prompt for all models.

- **Skill files**: **Claude Agent SDK** supports skill files. **OpenAI SDK** does not support skills yet. Skill support changes how the same agent runs on different models.

- **Provider diversity**: You can keep one model but use different providers. **Azure** and **AWS** can supply the same model. If Azure goes down, AWS can stay up. **Bedrock** solves the multi-provider problem.

- **Cost benefit**: Diversification is a rabbit hole. If one model is a fixed choice and its outage is acceptable, add the effort only if the benefit is worth it.

- **Lost in the middle**: With a long prompt, the model focuses on the start and the end. It often ignores the middle.

- **Prompt concatenation**: Repeating the same prompt twice gives better results. It forces the model to pass through the middle content. It doubles input token use.

- **Eval role**: **Evals** measure how much context a model respects. For incident remediation, you can write evals with sample runbooks. The eval expects a specific string output. If the output is wrong, something is broken.

- An agent can iterate on a prompt until its **evals** succeed.
- **Evals** are like unit tests for agents.
- If an eval passes, you assume a loss in the middle does not affect the outcome.
- The quality of your evals controls how certain you can be.

- **Rolling summarization** replaces every N turns with a summary.
- It works only for long-running agents or coding agents.
- It does not work for stateless chat applications.
- In a chat API, one request arrives, the agent responds, and the call ends.
- There is no notion of turns across calls, so rolling summarization is difficult.

- **Hierarchical memory consolidation** depends on how you define the graph and the entities.
- It is very use case specific.
- Example: Google Meet transcription.
- You gather evidence of key decisions, who said what, and recommended next steps.
- This is structured data extraction, not a graph.
- You process each 10 minute chunk, gather data, and consolidate it at the end.

- **Weighted memory** is not the default for all memories.
- Memories split into **facts** and **preferences**.
- Facts stay as they are.
- Preferences always have a weight or a decay over time.
- Example: the capital of India is a fact, not a preference.

- **Procedural memory** lets an agent remember what it did.
- The agent uses it to give better recommendations.
- It supports the self-improvement of agents.
- Good behavior gets reinforced.

- The four memory naming conventions are **episodic**, **semantic**, **procedural**, and **short-term**.
- **Episodic memory** ties a memory to when it happened.
- You can reference back to the situation.
- **Semantic memory** takes multiple episodes and extracts common themes.
- It is an aggregation over multiple episodic memories.
- Example: a user has five conversations about booking a hotel.
- Each time, the user wants a hotel with a swimming pool.
- You extract this as a user preference.
- That preference becomes a semantic memory.
- In the same conversation, it is an episodic memory linked to that conversation.
- Semantic memory is more powerful.
- A single episode can happen once and never repeat.
- A repeated theme gives a stronger signal.
- **Procedural memory** records the actions an agent took.
- Correct actions and wrong actions are both recorded.
- Good behavior is reinforced.

- The example is a second brain system built by Akash.
- He made a video on building a second brain in Obsidian.
- He uses Gemini with credits.
- He built a CLI tool called `brain`.
- The tool summarizes learnings and notes.
- It creates detailed notes.
- It adds the notes to the second brain.
- `brain add thought` adds a social media post.
- He calls all social media posts thoughts.
- The tool classifies each thought into categories.
- Examples: AI thoughts, career growth thoughts, funny posts.
- The tool creates tags.
- He does not use tags for navigation, only for reading.
- `brain add URL` fetches a URL and adds it as if he has read it.
- He calls this only when he already learned the content.
- `brain learn URL` fetches the URL and shows the content on the terminal.
- The terminal renders Markdown beautifully.
- The tool extracts information and renders it.
- The knowledge base stores the notes for recall.

- **Brain** is a personal software tool. It works on the terminal.
- Brain reads blog posts in **markdown** format.
- Brain makes all articles look the same. This reduces **cognitive overhead**. The user does not remember different website styles.
- Brain shows a **summary** on the right side. It shows key concepts, ideas worth writing about, insights, maxims, analogies, and mental models.
- Brain has a **settings file**. The file lives in the brain config folder. The user expects the file to be named **config.json**.
- The settings file lists **rejected topics**. These are topics the user never wants to read.
- The author gives **CSS** as an example of a rejected topic. Brain flags such articles. The user skips them.
- Brain has a **read** command. It reads books on the terminal.
- The user has three books in Brain. Brain tracks the current book and resumes from the saved point.
- Brain stores reading state in **S3**. S3 stores each page of a book. S3 also tracks the last read page.
- The rest of Brain uses **Obsidian**.
- **S4DB** is a custom database the author built. It is a simple embedded database in Python. It is a **key value store**.
- S4DB does key value lookups on **S3**. The user points to a bucket and a prefix.
- S4DB puts data into S3 and gets data from S3. It keeps a **local cache**. A cache hit does not call S3. This saves money.
- The author prompted **LLMs** to write the code. He prompted **Gemini** for many parts. He built the software for his own needs.
- The author believes **everybody should have their own software**.
- **Rumi** is an app for his daughter. It is named after her favorite character.
- Rumi has a **parent login** and a **child login**.
- The daughter is five and a half years old. The app pushes her to do more **maths**.
- The author creates **topics** and **questions** for each topic. AI generates the content.
- The parent defines the type of questions. Example prompt: a single variable equation word problem for a child. The equation uses basic operations.
- The author created a **notebook** for **UKG**.
- The parent creates a new **quiz**. He selects question types and the count per type. The app generates the quiz.
- Example: seven questions of one type and eight questions of another type. This makes a 15 question quiz.
- The child sees the **active quiz** in the child login. She can use an iPad. She prefers a **blackboard**. The parent reads questions, and the child solves them. This is a **bonding** moment.
- The app can **print a PDF**. The author uses simple **HTML** with a **control P** event in JavaScript. There is no PDF parser.
- The author tells the LLM to output HTML. This stops the LLM from going in a random direction.
- The author gives the printout in the morning. The child finishes by evening. She earns **stars and stickers**.
- Each quiz has an explanation. The user can **regenerate**. The quiz uses **LaTeX**.
- The author stored data in **Postgres**. A bad migration deleted all the data.
- The author lost more than **70 quizzes**. Topics included single digit addition, single digit subtraction, double digit addition, four digit addition, multiplication, division, single variable equations, and word problems.
- The app now uses **DynamoDB**. The deletion restriction is blocked. The app cannot delete anything.
- Future topics include word problems with multiplication, science questions, and speed distance time questions.
- **Onboarding buddy** is another custom tool. The author joined a new team. He built the tool to process 2025 documents.
- Onboarding buddy creates **milestones**. It gives a **test** at the end of each milestone.
- The quiz checks real understanding. It holds the full **corpus** of knowledge. It generates **multiple choice questions** and answers.
- The author says most people do not know what to do with AI. He sees **AI as a superpower**.

- The father believes **people are bad at identifying problems**. He wants people to find problems that are worth solving.

- He built a learning app called **Roomy**. He did not open-source it. He thought of offering it as a login service.

- The app had no login at first. It ran locally on Docker. He moved it to the cloud so it did not depend on a computer that was turned on.

- He added a **push feature** with a **Pusher channel**. A language model generated each quiz from the child's **history**. The history stopped repeats.

- Each quiz had one **illustration** and text that read like a **YouTube script**. The conversational style made the text pleasant to read aloud.

- The daughter is five and a half years old. She just started reading, and she loves reading facts. The iPad rings when a quiz arrives, and she runs to read it.

- The father tested the feature once from his office. The quiz arrived at 6.15 PM, when the child was home. His wife confirmed the **positive result**.

- The father gives **no restriction** on screen time. His parents forced him to stop watching TV, so he watched more. When they stopped forcing him, he became bored with it.

- He sees his daughter as a **carbon copy** of himself in behavior. He applies the same method to her. She gets bored after about 15 minutes and asks to solve problems. Sometimes she watches for two hours.

- He uses **screen time as positive reinforcement**. The reward works because she solves 25 to 40 questions per day.

- Her **maximum** was 125 questions in one day. That day she studied for four and a half to five hours without a stop. The work was single-digit and double-digit addition and subtraction. Subtraction had no borrow, and addition had carry. She did the math in her head.

- The parent used a **star chart**. The daughter asked for a star for every five correct answers. That day the blackboard filled with stars.

- He bought a **wall sticker** that turns a wall into a blackboard. He ordered it within one week of moving to the new home. It cost 600 rupees, and he calls it his best investment.

- He says he is **raising his co-founder**. He calls her his **neural network**. He trains her to become a future co-founder.

- He has **zero trust** in the education system. So he raises his own future founder instead.

- The **fallback plan**: she becomes an engineer like him. The **best case**: in ten years, she starts a startup with him. The whole project is an **experiment**.

- He was inspired by **Laszlo Polgar**, a chess grandmaster. Polgar believed **geniuses are not born, they are made**. His three daughters all became grandmasters. The father read about Polgar eight or nine years ago. He calls the idea not a forcing function, but it stayed with him.

- The daughter recorded **two YouTube videos**. She saw her father make videos and wanted to do the same. She wants to become famous at age 20. She can explain the **prism effect** and the **water cycle**.

- The father watches the child's videos, such as Mikey and JJ and Minecraft content. He does this for one daily moment. She runs to him and says, "Papa, your favorite song is here."

- The daughter now understands science. She knows why light splits and that light has wavelengths.
- She also explains how plants grow. She learns that sound is physical.
- The family has three recorded videos. The parent does not post them yet.
- The daughter thinks the videos are live on the internet. This is her incentive. The promise is that people will greet her in two years.
- The parent sees his own traits in his daughter. These traits are a need for external validation, a lack of confidence, and copying of behavior.
- Advice for parents: use LLMs to build useful things. Find problems that are worth solving.
- Good example problems are an onboarding buddy and practice projects.
- When you become a parent, build such things. This makes your child excited about learning.
- He calls the AI "AI Aunty". The daughter forms a personal bond with it.
- The daughter writes code sometimes. The parent asks her what she wants to build.
- He lets her imagination go free. She invented an animal with the body of a lion and the face of a giraffe.
- She invented another animal, the "tosquito". It is a combination of a tortoise and a mosquito.
- Later she merged several animals. The parent gave her a different example. He guided her to a new direction.
- He taught her to write code and to build an app. She asked for a game where the character can jump and swim.
- The parent used Claude Opus to build that game. He bought a Claude subscription.
- The AI understands the tone of a child. This was a surprise. The second iteration was much better.
- The daughter learned what to say and what not to say. She became a "prompt engineer".
- She writes simple, clear prompts. Example: "Make this look beautiful. Not round square."
- She uses a full scientific calculator. She does not do mental math. She knows the value of 6% of 24, but she lets the tool work.
- His rule: if she can turn text into equations, that is good enough. The AI does the calculation.
- He states the same rule for all prompt engineers. The main skills are intuition and problem solving. He focuses on these.

## High-Yield Points

- The **lost in the middle problem** affects a very large context. The middle gets less attention than the beginning and the end.

- A large context creates cost in three ways. You pay for all tokens for every LLM call. Prompt caching loses its benefit when the memory is compressed or changed.

- External key-value memory requires a **deterministic key**. The tool description and the input schema must be precise.

- Retrieval is not always semantic. Pointed key-value lookups and Elasticsearch keyword lookups are common.

- In the lost in the middle problem, the first and last tokens get more attention than the middle tokens. A bigger context window does not give equal attention to all tokens.

- Copying and pasting the entire prompt twice can give a better result. It acts as a forcing function.

- Evicting the oldest content takes a hit on prompt caching. Decide what to evict and why before you evict it.

- Episodic memory is usually queried as structured data. Vector memory serves semantic lookup of verbose text.

- Eviction is risky when the workflow is not deterministic. A later step may need a removed result.

- Summarization is always lossy and slow, but it is general purpose and usually safe.

- External storage is similar to eviction. Store on disk or in a database, then load when needed.

- For eviction to work, tag each message with its purpose, for example in a dictionary.

- **Eviction is lossy**. It removes old messages from the context window. A recall test on the eviction phase could not find the evicted information.
- **Summarization is lossy too**. It compresses history into a summary. The dense settings (extreme abbreviation and a 100 word maximum) increase the loss. The recall test on the summarization phase failed.
- **Write the summarization prompt for the task, not as a general instruction**. A generic prompt skips task-critical facts. A prescriptive prompt names what matters: commands, numbers, table names, constraint names, procedures, breaking changes, and actionables.
- **Eviction triggers at 90% of the context budget**. At 2000 tokens, the trigger is near 1800 tokens. Use external storage with semantic lookup when you must recall data later.

- Evals guard critical information. If a strategy change removes the rollback command, the eval reports the error.

- A sliding window can evict the system prompt. Store the system prompt apart from conversation messages.

- Rough token estimates are enough. Not everything needs a network call.

- Use summarization as the default. It avoids the hard choice of what to evict.

- Eviction did not trigger in this session. Context stayed below the 90% threshold.
- The dense summary instruction caused command loss. The summary dropped from 1000 to 220 tokens.
- The external DB makes one search per step, except the first step, because the database is empty at the start.
- Weighted retention follows exponential decay. The weight never reaches zero, but it is forgotten below 0.001.

- Decay does not apply to critical memories. Critical events stay forever.

- The cost of noisy memory is high. Do not persist every conversation.

- Use an upsert for a changed fact. Compare "like pizza then like burger" (append) with "used to like pizza then like burger" (replace).

- Use verbose canonical keys with tags. Keys support tracing and debugging.

- The action type depends on the relation verb. "Works as" and "lives in" are current states and use upsert. "Codes in" is additive and uses add.

- The system can wrongly delete entries. In the "also meeting Pratik" example, it removed Sarah instead of keeping her.

- A prescriptive prompt improves reliability. Crisp uppercase relations and explicit action rules reduce duplicates and odd output.

- You can cut cost with a cheaper model and batched extraction instead of per-conversation extraction.

- Testable point one: Define all relations in an enum schema in Pydantic. Give the same schema to the LLM so the relation set stays fixed.
- Testable point two: Link every memory to its source text and chat ID. Without this link, you cannot debug why a bug happened.
- Testable point three: Use spaCy for clean English input. Use an LLM when input carries uncertainty, such as customer support chats.
- Testable point four: Do extraction asynchronously in production. A CDC pipeline removes the need for a synchronous agentic update.

- The specialist returns only its final output. The orchestrator does not receive intermediate messages.
- A handoff is a real **agentic loop**, not a single tool call.
- **Tool isolation** limits each agent to its own tools. This is a key benefit.
- Use **multi-agent** for parallel, independent subtasks. Do not use it for one simple task.

- The **scatter and gather** lives in asyncio. You append tasks, then gather them. You must wait for all tasks before you proceed.

- The agent split comes from **structured output**. The planner returns the title, description, and agent type. This drives the routing.

- Sub agents work in isolation. The orchestrator must not peek into their work. It reads only the final output.

- Agents are for inter-agent round trips. Skills are for work inside one agent.

- Use the LLM for intelligence, not for orchestration. If you know how a task runs, write the code directly.

- The polling loop is plain Python code. It is not part of the agent tick loop. It polls the database until all subtasks finish.

- Deterministic workflows can meet an SLO. A workflow where the agent chooses the number of subtasks has no determinism and cannot meet an SLO.

- A2A is not reliable at this stage. Prefer Temporal or an Airflow DAG for workflow control.

- A skill is fine when the flow is simple, deterministic, and the token cost is acceptable.

- Convert a skill into a deterministic workflow when the user expects full determinism or the team chases efficiency.

- Use the LLM for intelligence, not for decision points that only wait on a tool call.

- An agent catalog still produces a deterministic flow. The fixed agent set limits the behaviors.

- Temporal code comes from the Agent SDK workflow. This is plain Python plus a decorator.

- The critic refiner costs time and tokens. Use it only when correctness is more important than speed.
- In mixture of agents, you can pick the best output or combine all outputs into a synthesized report.
- Deadlock happens when two or more agents keep handing off to each other. It is common when agents are owned by different teams.
- To prevent deadlock, cap the iteration count, add a convergence criteria, or add a supervisor that polls the database.

- **Load is low, latency is the driver.** At 5000 alerts per day, the average load is below one alert per second. The peak is about 1 to 2 alerts per second. So throughput is not the bottleneck. The strict latency targets shape the design.
- **Priority is critical.** An alert without priority makes all incidents equal. The system cannot separate a P1 from a P3.
- **Augment, do not replace.** The incident lifecycle state machine must fit the current workflow. Forced replacement of existing flows fails as forced adoption.
- **Citations enable the feedback loop.** A self-contained report with citations lets readers flag outdated information. That flag feeds back into the system.

- Grouping raw events is required. Ungrouped alerts waste tokens and compute.
- Several systems can fail from one root cause. You must treat them individually, not as one group.
- The system must alert on itself. A growing queue can break the 90 second P1 SLA.
- Each agent has a small sequential call budget of about 5 calls. Parallel agents must cover the rest.

- Peak demand is about 150 LLM calls per second. This number sets the top rate limit for the provider.
- The agent loop must span at least two LLM providers. Provider uptime matters as much as infrastructure uptime.
- The output to the on-caller must be short. Verbose output fails the goal because the on-caller has little time.
- Run book lookup needs RAG retrieval because no single run book can cover every issue.

- A recent deployment is not always the cause. A feature flag turned on today can change behavior today even when the code is two weeks old.
- The agent must show its path: the queries it ran and the run book it used. This makes the conclusion verifiable.
- Past incidents are memory. They guide the agent with partial weightage only. The agent keeps its reasoning loop.
- Never let the agent flip any config bit through an MCP tool. High-priority systems need human review.

- The AI never executes directly. The on-call engineer approves every command. This is human-in-the-loop.
- The run button does not need an agent. It makes a direct MCP tool call to the executor.
- You do not log in to a server to run a command. The executor abstracts the SSH connection for you.
- Start with one small problem. Keep the command output correct before you enhance the system.

- Use **chunking** for incident remediation. Use **summarization** for long-term support correspondence.
- A background process must add **value** through its outputs. Otherwise, it is not worth its cost.
- The state "out of outage" does not mean "done". The long-term fix can still be open.
- **Real-time** work happens during the outage, within the SLA. **Non-real-time** work happens after the SLA window.

- A four core machine handles four incidents to give each incident a dedicated CPU and add failure buffer.
- Use a human in the loop to approve tool arguments. This makes execution deterministic.
- Limit LLM-created relations. Unlimited relations make a graph query hard to craft.
- Stop the loop at the point of diminishing return, a stuck cycle, or an SLA breach at twice the SLA.

- Summaries replace removed turns and use the **user role**, not the assistant role.
- **Lost in the middle** means a long prompt focuses on the start and the end. Repeating the prompt twice fixes this but doubles input token use.
- Model output differs across models. Use a **prompt registry** per model, or rely on **evals** to test one prompt across models.
- The executor uses a **RAG pipeline** and a vector database for runbooks. It does not use a runbook tool for its own memory or state.

- Rolling summarization fails for stateless chat APIs because each request is one call with no turn history across calls.
- Facts do not decay, but preferences always carry a weight or a decay.
- Semantic memory aggregates multiple episodic memories, so a repeated signal is stronger than a single episode.
- Transcription consolidation is structured data extraction merged from chunks, not a graph.

- The **rejected topics** list makes Brain skip unwanted articles. CSS is the example. The match means never read and move on.
- **S4DB** keeps a local cache. A cache hit skips the S3 call. This design saves money.
- The **Postgres migration** caused total data loss. It deleted more than 70 quizzes. The move to **DynamoDB** blocks deletion.
- The quiz PDF uses **HTML with a control P event**. There is no PDF parser. The author controls the LLM output direction this way.

- The quiz system does not repeat questions. It draws on the child's past history. This is a core design rule.

- Screen time has no restriction. The reward system works because it is paired with a daily output of 25 to 40 solved questions.

- The **stopping condition** is clear. The father stops the program the day the child cries about it. He continues only while she shows joy.

- The Polgar model is an experiment, not a forced plan. The child can reciprocate or refuse.

- The child does not memorize science. She explains why and how things happen. Example: she explains why light splits.
- The AI has a personal name and a person role, "AI Aunty". This builds the child's attachment and her will to write prompts.
- The reward is delayed by two years. The child believes the videos are live. This keeps her motivated now.
- The parent values idea expression over calculation speed. The child converts text to equations. She uses a calculator for the math.

## Flashcards

**Front**: What is in-context memory?

**Back**: It is the context you keep adding to the conversation. It is part of the context window and needs no retrieval.

**Front**: What is the lost in the middle problem?

**Back**: The LLM gives most attention to the beginning and the end of the context. The middle gets less focus.

**Front**: Why is a very large context window a problem?

**Back**: It causes the lost in the middle problem. It raises cost because you pay for all tokens. It reduces the benefit of prompt caching.

**Front**: What does an external key-value store do in a memory system?

**Back**: It stores named facts outside the context, such as a customer rate limit. A tool call retrieves the value with a deterministic key.

**Front**: What is the lost in the middle problem?

**Back**: In a long context, the first content and the last content get more attention than the middle content.

**Front**: What is the main difference between episodic memory and vector memory?

**Back**: Episodic memory stores key facts, events, and decisions as structured data for structured queries. Vector memory handles verbose text with semantic lookup.

**Front**: What happens to prompt caching when you evict the oldest content?

**Back**: Prompt caching takes a hit, so you must be mindful of what you evict and why.

**Front**: Why is in-context memory the most important memory type?

**Back**: It directly impacts cost because whatever is in the context goes into every prompt.

**Front**: What is eviction in context window management?
**Back**: It is the removal of old context. You remove parts you are sure you will not need again.

**Front**: Why is summarization lossy?
**Back**: A summary may skip an important detail, such as a tool call output that you need later.

**Front**: Give one example where summarization is useful.
**Back**: A customer support chatbot. The conversation is long chit-chat. You replace the whole context with one summary and save tokens.

**Front**: What are two forms of external storage for context?
**Back**: A database or a disk. A coding agent uses temporary files on disk as external storage.

**Front**: Which three strategies manage a finite context window in the demo?
**Back**: Eviction, summarization, and external storage.

**Front**: What happens when the tokens reach 90% of the context budget?
**Back**: Eviction triggers. The sliding window removes old messages from the context window.

**Front**: Why must the summarization prompt be prescriptive and task-specific?
**Back**: A generic prompt skips task-important detail. A prescriptive prompt keeps exact commands, numbers, table names, constraint names, procedures, breaking changes, and actionables.

**Front**: Which strategy allows later recall without loss?
**Back**: External storage with semantic lookup (ChromaDB). Eviction and summarization are lossy.

**Front**: What happens if an eviction strategy removes the system prompt?

**Back**: A sliding window strategy can do this. Keep the system prompt in a separate array to protect it.

**Front**: What does /compact with a custom prompt do?

**Back**: It runs compaction and focuses on your prompt, for example "always remember X and Y facts".

**Front**: Why use word count instead of a network call for tokens?

**Back**: A rough estimate is enough. An error of 100 to 300 tokens is acceptable for summarization.

**Front**: Where was the exact rollback command retained in the test?

**Back**: In Chroma DB. The query found it there and produced the correct output.

**Front**: What triggers context eviction in this system?
**Back**: Eviction triggers when context usage hits 90% of the budget.

**Front**: Why did the summarization lose exact commands?
**Back**: The prompt asked for dense output where every token must carry information. This forced very short and abbreviated summaries.

**Front**: When should open items be turned into tickets?
**Back**: At the end of the conversation, after human review, not during each step.

**Front**: How does weighted retention mimic human forgetting?
**Back**: Recent information is more important. Weight decays exponentially, and the memory is forgotten once the weight goes below 0.001.

**Front**: What happens to a memory under exponential decay?
**Back**: The memory loses weight over time. The agent forgets the old fact and reports the latest fact.

**Front**: How does the agent treat critical memories such as a marriage or a child?
**Back**: It remembers them forever. The LLM prompt flags them as critical.

**Front**: When does the agent append a memory instead of replacing it?
**Back**: It appends when the new fact adds to the old fact, such as "I like pizza" then "I like burger". It replaces when the new fact cancels the old fact, such as "I used to like pizza, but now I like burger".

**Front**: What is an upsert operation used for in memory actions?
**Back**: The agent uses upsert to update an existing memory or insert a new one. A changed fact triggers an update, not an append.

**Front**: What are the three memory actions an LLM can extract?

**Back**: Add, upsert, and delete.

**Front**: When is upsert used instead of add?

**Back**: When the relation describes a current state that can change, such as "works as" or a meeting date.

**Front**: How is memory stored in the toy example?

**Back**: As a simple list, not a graph database. The agent does a linear scan and then replaces or adds an entry.

**Front**: How can the cost of memory extraction be reduced?

**Back**: Use a weaker or cheaper model. Run extraction in batches for a set of commands, not for every conversation.

**Front**: What limits the set of relations in the memory store?
**Back**: An enum data type in Pydantic defines all the relations. The schema fixes the allowed set.

**Front**: When should you use spaCy instead of an LLM for NER?
**Back**: Use spaCy when the input is well-formatted, legit English text, such as news articles.

**Front**: How do you update memory in a production system?
**Back**: Use a CDC pipeline. It consumes conversation events and extracts updates asynchronously outside the agent loop.

**Front**: What output format should the LLM produce for graph insertion?
**Back**: An RDF tuple with subject, object, and verb. This format is easy for the LLM to generate.

**Front**: What is the difference between a monolith and a multi-agent system?
**Back**: A monolith is one agent with a large context. A multi-agent system runs many single agents for separate subtasks.

**Front**: What is the role of the orchestrator in the orchestrator specialist pattern?
**Back**: It splits the task into subtasks, hands each subtask to a specialist, waits for the output, and decides what to do next.

**Front**: What is the difference between a handoff and a tool call?
**Back**: A tool call is an external call to a system. A handoff runs a full agentic loop that returns one final output.

**Front**: What is tool isolation?
**Back**: It gives each agent access to only its own tools. Example: the metric agent cannot access log tools.

**Front**: What form does the lead planner output take?

**Back**: A structured Pydantic model. Each subtask has a title, a description, and an agent type.

**Front**: What does the asyncio pattern do in this system?

**Back**: It scatters and gathers. It appends subtask tasks and waits for all of them before it proceeds.

**Front**: Why must the orchestrator not look into sub agent work?

**Back**: Sub agents have no access to the orchestrator conversation. The orchestrator reads only the final output.

**Front**: When do you use agents instead of skills?

**Back**: Use agents when round trips between agents are needed. Use skills in one agent when no round trip is needed.

**Front**: What replaces a hand-written polling loop in a distributed system?
**Back**: A workflow engine such as Temporal or an Airflow DAG.

**Front**: What is the rule for using an LLM in a production system?
**Back**: Use the LLM for intelligence, not for orchestration.

**Front**: Why can you not make an SLO for an endpoint where an agent can spin 10, 100, or 1000 agents?
**Back**: The number of subtasks is unpredictable. There is no determinism. The behavior changes on each run.

**Front**: When is a skill good enough for a workflow?

**Back**: When the workflow is simple and deterministic, and the user accepts a few extra tokens.

**Front**: Why will the team convert skills into deterministic workflows?

**Back**: Cost and scale. With millions of merchants, LLM-driven orchestration becomes too costly.

**Front**: How can an Agent SDK workflow become a Temporal workflow?

**Back**: The workflow is Python code. Add a decorator to generate the Temporal code, then validate it with a human in the loop.

**Front**: Does an agent catalog with run time agent selection stay deterministic?

**Back**: Yes. The agent set is fixed, and exactly one agent serves each request.

**Front**: What is the critic refiner pattern?

**Back**: A critic reviews the output of a main agent and finds flaws. A refiner refines the output based on the findings.

**Front**: When should you use a critic refiner?

**Back**: When correctness is more important than speed, because the extra loop is costly in time and tokens.

**Front**: What is mixture of agents?

**Back**: Give the same task to multiple agents, then pick the best output or combine all outputs with a synthesizer.

**Front**: How do you fix a deadlock between two agents?

**Back**: Cap the iteration count, add an explicit convergence criteria, or add a supervisor agent that polls the database and detects the loop.

**Front**: What is the P99 time-to-first-action target for each incident priority?
**Back**: P1 is 90 seconds. P2 is 5 minutes. P3 is 15 minutes.

**Front**: Who executes remediation actions first, and when do agents act?
**Back**: A human executes first. Agents act automatically only when the triage confidence is high.

**Front**: What is the average and peak alert rate for a system with 5000 alerts per day?
**Back**: The average is below one alert per second. The peak is about 1 to 2 alerts per second.

**Front**: Why must citations be part of the triage report?
**Back**: Citations show the source of each claim. Readers flag outdated citations, and this becomes the feedback loop for the system.

**Front**: What is the P1 triage window and the average latency budget?

**Back**: The P1 window is 90 seconds. The average latency budget is 30 seconds.

**Front**: What is the alert flow after grouping?

**Back**: 5000 alerts per day, with about 50 at peak, group into about 3 incidents. The worst case is about 30 per runtime.

**Front**: Why is a recent deployment the first thing to check?

**Back**: Most incidents follow a recent deployment. Rollback is the first remediation step.

**Front**: How many sequential LLM calls can one agent make in 30 seconds?

**Back**: About 5 sequential calls. It can also run many parallel calls.

**Front**: What is the peak LLM call rate this system must support?
**Back**: About 150 LLM calls per second. This sets the top-level LLM rate limit.

**Front**: Why must the agent loop span at least two providers?
**Back**: If one provider is down, the system uses a fallback and still resolves the incident.

**Front**: What is the maximum step count for the agent?
**Back**: Five steps. The step limit also limits the number of LLM calls.

**Front**: How does the agent find the right run book?
**Back**: It uses a RAG system. A vector database indexes all run books. The agent makes a RAG call to get relevant content.

**Front**: Why must the agent show the log queries it ran?
**Back**: So the on-call engineer can see how the agent reached its conclusion.

**Front**: Why must the output include the feature flag audit history?
**Back**: A flag turned on today goes live today, even when its code deployed two weeks ago.

**Front**: What role do past incident records play?
**Back**: They are memory that guides the agent with partial weightage inside a reasoning loop.

**Front**: Who performs the actual remediation?
**Back**: The on-call engineer. The agent auto-remediates only safe, low-severity issues.

**Front**: What does the run button on the correspondence do?
**Back**: It makes an API call. The call sends an MCP tool call to the command executor.

**Front**: Who decides if a command is correct before it runs?
**Back**: The on-call engineer. A professional reviews the output and takes the action.

**Front**: What is the role of the command executor?
**Back**: It has connectivity to K8s, AWS, feature flags, and other subsystems. It runs the commands and returns the response.

**Front**: Why does MCP make the life of the on-caller easier?
**Back**: The executor exposes the tools at the MCP level. The system finds multiple actions and invokes multiple MCP servers in one job.

**Front**: When is chunking better than summarization for Jira correspondence?
**Back**: Chunking is better for incident remediation, where the goal is to fix the issue quickly during the outage.

**Front**: How does the summarizer for long-term support work?
**Back**: It reads comments in small chunks, updates the document each time, and produces a final summary with actions and open items.

**Front**: What does the state "out of outage" mean?
**Back**: It means the incident is remediated, but the long-term fix is not yet implemented and remains an open item.

**Front**: When should you run a background agent or critic?
**Back**: Run it only if it adds value. People often ignore AI review comments, so low-value critics are not worth their cost.

**Front**: Why does a four core machine handle only four incidents?
**Back**: Each incident gets a dedicated CPU. A higher count adds memory and context window pressure.

**Front**: How do you stop an LLM from using a wrong instance number in a tool call?
**Back**: Use a human in the loop. The human approves or changes the argument before execution.

**Front**: What methods recall the evolving conversation memory?
**Back**: A graph query. The query uses a limited relation set and a defined node schema.

**Front**: What role does the summarized conversation use in the agent loop?

**Back**: It uses the user role, not the assistant role. The summary continues the conversation as user input.

**Front**: What is the lost in the middle problem?

**Back**: With a long prompt, the model focuses on the start and the end, and ignores the middle content. Repeating the prompt forces the model through the middle, but it doubles input token use.

**Front**: How can one LLM stay reliable across providers?

**Back**: Use different providers that host the same model. For example, Azure and AWS can both supply the model. Services such as Bedrock manage the multi-provider setup. If Azure goes down, AWS can stay up.

**Front**: Why does rolling summarization not work for chat APIs?

**Back**: Chat APIs receive one request at a time. Each call ends after the response. There is no notion of turns across calls. Rolling works only for long-running or coding agents.

**Front**: What is the difference between factual and preference memories in the weighted memory model?

**Back**: Facts stay as they are and do not decay. Preferences always carry a weight or a decay over time.

**Front**: How does semantic memory differ from episodic memory?

**Back**: Episodic memory ties a memory to when it happened. Semantic memory aggregates themes from multiple episodes. Semantic memory is more powerful because a repeated signal is stronger.

**Front**: What does the `brain learn` command do?

**Back**: It fetches a URL and shows the content on the terminal for the user to learn from. It does not add the content to the knowledge base.

**Front**: What is Brain in this transcript?

**Back**: It is a personal command line tool that reads blog posts and books in a uniform markdown format, with summaries and reading state.

**Front**: What are rejected topics in Brain?

**Back**: They are topics the user never wants to read. Brain flags those articles so the user can skip them.

**Front**: What is S4DB?

**Back**: It is a simple embedded key value database in Python that puts and gets data from S3, with a local cache to save money.

**Front**: What is Onboarding buddy?

**Back**: It is a custom tool that creates onboarding milestones and a test after each milestone, built for a new team with 2025 documents.

**Front**: What did the father build to send facts to his daughter?

**Back**: He built a quiz push system with a Pusher channel. A model generated each quiz from her history. The iPad rang when a quiz arrived.

**Front**: What is the father's approach to screen time?

**Back**: No restriction. He uses screen time as positive reinforcement. His parents forced him, so he watched more. His daughter gets bored and asks to solve problems.

**Front**: Who is Polgar, and what did he believe?

**Back**: Laszlo Polgar was a chess grandmaster. He believed genius is made, not born. His three daughters all became grandmasters.

**Front**: What does the father say he is raising?

**Back**: He says he is raising his co-founder. He calls her his neural network. He wants her to start a startup with him in the future.

**Front**: Why does the child think her videos are live on the internet?

**Back**: She thinks the videos are live. This is her incentive. The promise is that people will greet her in two years.

**Front**: What is a "tosquito"?

**Back**: It is an imaginary animal. It is a combination of a tortoise and a mosquito. She asked AI Aunty to build it.

**Front**: What game did the child ask for first?

**Back**: A game where the character can jump and swim at the same time. The parent used Claude to build it.

**Front**: Why does the daughter write better prompts now?

**Back**: She practiced with the AI and learned what to say and what not to say. She uses short, direct requests.

## Practice Quiz

1. How is in-context memory different from external memory?

2. Name two downsides of a very large context window.

3. A tool call must fetch the rate limit of a customer. What must the tool description include?

**1. Answer:** In-context memory is part of the context window and needs no retrieval. External memory lives in an external system and needs retrieval with a deterministic key or query.

**2. Answer:** It causes the lost in the middle problem. It also raises cost because you pay for all tokens. It can reduce the benefit of prompt caching.

**3. Answer:** The tool description must state the key format and the way to get the information.

1. A model has a context window of 1 million tokens. Does every token get equal attention? Explain the reason.

2. What is the main difference between episodic memory and vector memory for retrieval?

3. Why does evicting the oldest content cause a problem?

Answer Key

1. No. Every token does not get equal attention. The model gives more attention to the first and last content. This is the lost in the middle problem.

2. Episodic memory holds extracted facts, events, and decisions. You query it as structured data. Vector memory holds verbose text, and you retrieve it through semantic lookup.

3. Evicting the oldest content takes a hit on prompt caching. You must be mindful of what you evict and why you evict it.

1. Why is eviction risky?

2. Summarization is slow. Why?

3. In the workplace agent example, why were the first five steps removed?

**Answer Key**

1. Eviction is risky because you may not know if a later step needs the removed result. For example, step 8 might still need step 3 output.

2. Summarization is slow because it requires an LLM call to compress the old messages.

3. After step 5, only step 5 output mattered. The first five steps were not needed later, so removing them saved cost.

1. What triggers an eviction under the sliding window mechanism?
2. What did the recall test show about eviction and summarization?
3. Give two details that a task-specific summarization prompt must preserve.

**Answer Key**

1. Answer: The agent evicts old messages when the current tokens exceed the context budget. In the demo, eviction triggers when the tokens reach 90% of the budget, near 1800 tokens at a 2000 token budget.
2. Answer: Both strategies are lossy. The recall could not find the evicted information, and it could not find the summarized information.
3. Answer: Any two of these: exact commands, numbers, table names, constraint names, procedures, breaking changes, and actionables.

1. What does the default preservation prompt keep?

2. Why is summarization a good default for a general purpose agent?

3. Does Sonnet fail at compaction for sure?

Answer key:

1. The default preservation prompt keeps only critical facts, exact commands, numbers, and table names.

2. You do not know what is important. Summarization removes the need to choose what to evict.

3. No. The claim is uncertain. Treat it as false by default, because summarization is only historical messages.

1. What happens when context usage reaches 90% of the budget?

2. What caused the summary to shrink from 1000 tokens to 220 tokens?

3. Why does the external DB part keep context usage low?

Answer Key

1. **Eviction triggers.** It removes context when usage hits the 90% budget threshold. In this session it never triggered because usage stayed below 90%.

2. **The summarization prompt asked for dense output.** It required that every token carry information. This forced very short and abbreviated summaries, and exact commands were lost.

3. **It fetches only relevant documents and stores each new message.** Each step queries the database for relevant semantic information and returns only that. The system does not send the full stored history.

1. Why does retrieval become irrelevant and contradictory when the agent stores too much noisy memory?

2. What rule of thumb decides which memories to persist?

3. What operation should the agent output when the user says "I used to like Java, but now I like Go"?

Answer Key

1. Too much noisy memory bloats the context and degrades the signal to noise ratio (SNR). Junk can rank higher, so retrieval becomes irrelevant and contradictory.

2. Persist only decisions that would change agent behavior or future agent execution. For a personal assistant, persist user preferences.

3. The agent should output an upsert. The new fact cancels the old fact, so the agent replaces "I like Java" with "I like Go".

1. What are the three memory action types?

2. Why did "codes in Python" and then "codes in Rust" create two entries instead of one upsert?

3. What failure mode appears in the "I am also meeting Pratik" example?

Answer key

1. The three action types are add, upsert, and delete.

2. "Codes in" is an addition use case. A user can code in more than one language. The system adds a new entry instead of replacing one.

3. The system removed Sarah from memory. The user meant to add another meeting, but the system deleted an existing participant.

1. What happens when the user gives a new value for an existing fact?

2. Why does the chat ID belong with each memory?

3. When is an LLM preferred over spaCy for extraction?

**Answer Key**

1. The system replaces the old value. This is the UPSERT behavior of the current-state memory store.
2. The chat ID identifies the conversation that produced the memory. It supports audit and debugging of the extraction.
3. Use an LLM when the input has uncertainty. Human chats mix languages and informal styles, so spaCy would break.

1. When should you use a multi-agent system?

2. What does the specialist agent return to the orchestrator?

3. Why is tool isolation a benefit of multi-agent?

**Answer Key**

1. Use a multi-agent system when the task splits into independent subtasks that can run in parallel. Use it when you can speed up the work.
2. The specialist returns one final output. It does not return every intermediate message.
3. It limits each agent to the tools it needs. This prevents one agent from accessing tools that another agent uses.

1. What are the two possible agent types for a subtask?

2. How does the system hand off work across different machines?

3. What does the research critic agent do?

Answer Key

1. Web search and self-knowledge. The planner assigns one of these two types to each subtask. Self-knowledge covers theoretical concepts and fundamental physics.

2. It uses a shared database as a handoff point. Each worker polls the database for work. The worker picks up and runs a task. Temporal and Airflow use this model.

3. It reviews the parallel reports and finds gaps and conflicts. It conducts a cross-report gap analysis and audit.

1. Where does a distributed multi-agent system store shared state?

2. What is the job of the polling loop in an orchestrator?

3. Which tools does the speaker prefer over A2A for workflow execution?

Answer Key

1. The system stores shared state in a central database that acts as the state manager. Each agent polls the database for tasks.

2. The polling loop checks the database until all subtasks are complete. It is plain Python code. It is not part of the agent tick loop.

3. The speaker prefers Temporal, Airflow DAGs, and NATN. They are more deterministic and more reliable than A2A.

1. What is the abandoned cart workflow in the transcript?

2. Where should a team put the orchestration logic for a scaled, deterministic production flow?

3. An agent fabric selects an agent at each decision point. Does this make the flow non-deterministic?

Answer key:

1. **What is the abandoned cart workflow in the transcript?** The workflow covers a user who adds a product and goes to Razor Pay, then does not complete the payment. The system calls the user and negotiates to recover the payment. A skill runs this flow periodically.

2. **Where should a team put the orchestration logic for a scaled, deterministic production flow?** The team should move orchestration to a dedicated platform such as Temporal or Agno. The LLM should make calls only where these calls are essential.

3. **Does an agent fabric with run time agent selection make the flow non-deterministic?** No. The flow stays deterministic because the agent set is fixed. At each decision point the flow selects one available agent, so its behavior is one of a few defined paths.

1. Why do you add a critic refiner to an agent loop?
2. What happens in a deadlock between a refund agent and a shipping agent?
3. How can a supervisor agent detect a deadlock?

Answer Key

1. Why do you add a critic refiner to an agent loop?
To revalidate and refine the output when correctness is more important than speed.

2. What happens in a deadlock between a refund agent and a shipping agent?
Each agent hands off the ticket to the other. The loop never ends and no output is produced.

3. How can a supervisor agent detect a deadlock?
It polls the database, reads the delegation log, and uses an LLM call or a deterministic cycle check.

1. A company has 5000 alerts per day. Why is throughput not the main design concern, and what drives the design instead?
2. Why should the incident lifecycle state machine be custom to the organization and not copied from another system?
3. What happens when an alert carries no priority for the incident?

**Answer Key**

1. **Why throughput is not the concern.** The average load is below one alert per second, and the peak is about 1 to 2 alerts per second. This load is small. The strict latency targets drive the design, such as 90 seconds P99 for a P1 incident.
2. **Why the state machine must be custom.** Each organization has its own incident workflow. AI must augment the workflow, not replace it. A copied flow forces a different way of working, which faces forced adoption and fails.
3. **What happens without priority.** All alerts become equal. The system cannot rank the incident or apply the right time-to-first-action target, such as 90 seconds for a P1 versus 15 minutes for a P3.

1. How long does the system have to output a triage for a P1 incident?
2. What is the first remediation step when an incident follows a recent deployment?
3. Why is alert grouping important for the agent system?

**Answer Key**

1. The system has 90 seconds to output the triage. The average latency budget is 30 seconds.
2. Rollback to the previous version. Most incidents follow a recent deployment.
3. Grouping turns many raw events into a few incidents. This saves tokens and compute.

1. What number sets the top-level LLM rate limit for the system?

2. Why must the triage output be crisp and short for the on-caller?

3. How does the agent handle run book retrieval when no run book covers the issue?

Answer Key

1. About 150 LLM calls per second at peak. This is the top-level LLM rate limiting the system has.

2. The on-caller reads it in the Jira UI. Verbose output takes too long to read. By the time the on-caller finishes it, the incident is gone.

3. The agent uses RAG retrieval. The system indexes all run books in a vector database. The agent fetches the relevant content with a RAG call.

1. A deployment occurred two weeks ago. A feature flag turned on today. Can the agent call the deployment the cause?
2. How should the agent use past incident records?
3. Why must the agent state how it reached its conclusion?

**Answer key**

1. No. The deployment is too old. The flag went live today. The feature flag audit history is the better data source.
2. As guidance with partial weightage. The agent keeps its reasoning loop and can take a different path.
3. So the on-call engineer can verify the issue, the proposed fix, and the queries used.

I did not receive any transcript text in your message. The message contained only the formatting instructions. Please paste the transcript portion you want summarized, and I will create the study material for it.

1. What does the run button do in the correspondence?
2. How does the executor run a command on a server?
3. What is the first step of the incident process?

Answer key.

1. The run button makes an API call. It sends an MCP tool call to the command executor.
2. The executor uses a bash tier. It abstracts the SSH connection to the server, fires the command, and gets the response.
3. The system figures out the root cause. Most of the work is handled by the on-call engineer.

1. What is the purpose of the command execution log?
2. What is the terminal state for a background process that handles phase two?
3. What happens when the user executes commands instead of the MCP?

**Answer Key**

1. The command execution log is a central place to record all commands for an issue. It captures commands that the user does not write in the comments.
2. The terminal state is "AI triage complete" or "out of outage". This state marks that the incident is remediated even if the long-term fix is open.
3. The user should write the executed commands in the comments. If the user does not do this, the command execution log provides a central record.

1. What is the reasoning for limiting incidents per machine to four?

2. What is the recall method for the evolving conversation memory?

3. Name two stopping conditions for the investigation loop.

**Answer Key**

1. Each incident gets a dedicated CPU. A higher count adds memory and context window pressure.
2. Recall uses a graph query. The query uses a limited relation set and a defined node schema.
3. The loop stops at the point of diminishing return or at an SLA breach such as twice the SLA. A stuck loop is also a stopping condition.

1. What are two ways to handle output differences between models?

2. What does the query runbook index tool do?

3. What happens to the five turns when summarization runs?

Answer Key

1. Create a separate agent with a prompt crafted for each model, or use a prompt repository. A prompt repository can list the model, the prompt template, and the variables as columns. With good evals, you can also test one prompt across models, but only if no output degrades.

2. It queries a vector database. It uses a RAG pipeline to find the relevant runbooks. The prompt describes which runbooks or runbook types exist, so the agent can build a matching query.

3. It removes five turns, then adds the summary in their place. The summary uses the user role, not the assistant role.

1. Which memory type aggregates themes from multiple episodes?

2. In the weighted memory model, what happens to preferences?

3. When does Akash use `brain add URL` instead of `brain learn URL`?

**Answer Key**

1. **Semantic memory**. It is an aggregation over multiple episodic memories. A repeated theme gives a stronger signal.

2. **Preferences decay**. They always carry a weight or a decay over time. Facts stay as they are.

3. **After learning the content read**. He uses `brain add URL` only when he has already read and learned the content. He uses `brain learn URL` when he still needs to learn from it.

1. Where does Brain store the reading state for books?
2. What happened to the quiz data stored in Postgres?
3. Why does S4DB keep a local cache?

Answer Key

1. Brain stores reading state in **S3**. S3 stores each page of a book and tracks the last read page.
2. A bad **Postgres migration** deleted all the data. The author lost more than 70 quizzes.
3. S4DB uses a local cache so a cache hit does not call S3. This saves money.

1. How does the quiz system avoid repeating content?

2. What daily learning output is paired with screen time?

3. What is the stopping condition for the daughter's learning program?

**Answer Key**

1. The system uses the child's past history. Each generated quiz does not repeat what came before.

2. She solves 25 to 40 questions per day. Her maximum was 125 questions in one day.

3. The father stops the program the day the child cries about it. He continues only while she shows joy.

1. What does the parent want his daughter to do with science?

2. Why does the parent let his daughter use a full scientific calculator?

3. What changed for the daughter in the second iteration?

Answer Key:

1. Answer: He wants her to understand the process, not recall facts. She explains why light splits and how plants grow.
Reason: The child changed from memorizing to explaining cause and effect.

2. Answer: He wants her to turn ideas into equations and to leave the math to the tool.
Reason: The rule states "if she can articulate text to equations, good enough".

3. Answer: She learned the language of prompts. She knew what to say and what to avoid.
Reason: Better requests produced a much better result on the second try.