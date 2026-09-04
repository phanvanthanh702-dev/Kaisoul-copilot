/* =========================================================
   KAISOUL AI v1
   frontend/app.js

   IMPORTANT:
   - Không chứa API key.
   - Không tự quyết định quota.
   - Danh tính lấy từ KAISOUL ID/backend.
========================================================= */

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {
  API_BASE: "/api",
  MAX_MESSAGE_LENGTH: 10000,
  FREE_DAILY_LIMIT: 20,
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_EXTENSIONS: [
    "txt",
    "json",
    "js",
    "html",
    "css",
    "pdf"
  ],
  ALLOWED_IMAGE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ]
};


/* =========================================================
   STATE
========================================================= */

const state = {
  currentChatId: null,
  chats: [],
  messages: [],
  selectedFiles: [],

  user: null,
  plan: "FREE",

  quota: {
    used: 0,
    limit: 20,
    remaining: 20
  },

  isGenerating: false,
  abortController: null,

  memoryEnabled: true,

  settings: {
    theme: "dark",
    notifications: false
  }
};


/* =========================================================
   DOM
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  Array.from(document.querySelectorAll(selector));


const elements = {
  sidebar: $("#sidebar"),
  sidebarOverlay: $("#sidebarOverlay"),
  menuBtn: $("#menuBtn"),
  closeSidebar: $("#closeSidebar"),

  newChatBtn: $("#newChatBtn"),

  historySearch: $("#historySearch"),
  historyList: $("#historyList"),
  historyEmpty: $("#historyEmpty"),

  chatTitle: $("#chatTitle"),
  chatContainer: $("#chatContainer"),
  welcomeScreen: $("#welcomeScreen"),
  messages: $("#messages"),

  messageInput: $("#messageInput"),
  messageCounter: $("#messageCounter"),

  sendBtn: $("#sendBtn"),
  stopBtn: $("#stopBtn"),

  attachBtn: $("#attachBtn"),
  fileInput: $("#fileInput"),
  filePreview: $("#filePreview"),

  typingIndicator: $("#typingIndicator"),

  moreBtn: $("#moreBtn"),
  moreMenu: $("#moreMenu"),

  accountCard: $("#accountCard"),
  accountAvatar: $("#accountAvatar"),
  accountName: $("#accountName"),
  accountUsername: $("#accountUsername"),
  accountPlan: $("#accountPlan"),

  planName: $("#planName"),
  planStatus: $("#planStatus"),
  quotaText: $("#quotaText"),
  quotaBar: $("#quotaBar"),
  upgradeBtn: $("#upgradeBtn"),

  offlineState: $("#offlineState"),
  retryConnectionBtn: $("#retryConnectionBtn"),

  settingsModal: $("#settingsModal"),
  themeSelect: $("#themeSelect"),
  notificationToggle: $("#notificationToggle"),
  memoryToggle: $("#memoryToggle"),

  memoryModal: $("#memoryModal"),
  memoryList: $("#memoryList"),
  memoryEmpty: $("#memoryEmpty"),
  clearMemoryBtn: $("#clearMemoryBtn"),

  proModal: $("#proModal"),
  proContinueBtn: $("#proContinueBtn"),

  accountModal: $("#accountModal"),
  profileAvatar: $("#profileAvatar"),
  profileName: $("#profileName"),
  profileUsername: $("#profileUsername"),
  profileKaisoulId: $("#profileKaisoulId"),

  confirmModal: $("#confirmModal"),
  confirmTitle: $("#confirmTitle"),
  confirmMessage: $("#confirmMessage"),
  confirmCancel: $("#confirmCancel"),
  confirmOk: $("#confirmOk"),

  toast: $("#toast"),
  toastMessage: $("#toastMessage")
};


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    loadLocalSettings();
    applyTheme();
    bindEvents();
    updateOnlineState();
    autoResizeTextarea();
    updateCharacterCounter();

    renderEmptyHistory();
    updateComposerState();

    await loadSession();

  } catch (error) {
    console.error("KAISOUL AI init error:", error);
    showToast("Không thể khởi tạo KAISOUL AI.");
  }
}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

  /* Sidebar */

  elements.menuBtn?.addEventListener(
    "click",
    openSidebar
  );

  elements.closeSidebar?.addEventListener(
    "click",
    closeSidebar
  );

  elements.sidebarOverlay?.addEventListener(
    "click",
    closeSidebar
  );


  /* New chat */

  elements.newChatBtn?.addEventListener(
    "click",
    createNewChat
  );


  /* Message */

  elements.sendBtn?.addEventListener(
    "click",
    sendMessage
  );

  elements.stopBtn?.addEventListener(
    "click",
    stopGeneration
  );


  elements.messageInput?.addEventListener(
    "keydown",
    handleInputKeydown
  );

  elements.messageInput?.addEventListener(
    "input",
    () => {
      autoResizeTextarea();
      updateCharacterCounter();
      updateComposerState();
    }
  );


  /* Files */

  elements.attachBtn?.addEventListener(
    "click",
    () => elements.fileInput?.click()
  );

  elements.fileInput?.addEventListener(
    "change",
    handleFileSelection
  );


  /* Search */

  elements.historySearch?.addEventListener(
    "input",
    renderHistory
  );


  /* More */

  elements.moreBtn?.addEventListener(
    "click",
    toggleMoreMenu
  );


  /* Upgrade */

  elements.upgradeBtn?.addEventListener(
    "click",
    () => openModal("pro")
  );


  elements.proContinueBtn?.addEventListener(
    "click",
    () => {
      showToast(
        "Hệ thống thanh toán KAISOUL PRO 1 sẽ được kết nối sau."
      );
    }
  );


  /* Account */

  elements.accountCard?.addEventListener(
    "click",
    () => openModal("account")
  );


  /* Settings */

  elements.themeSelect?.addEventListener(
    "change",
    handleThemeChange
  );

  elements.notificationToggle?.addEventListener(
    "change",
    handleNotificationChange
  );

  elements.memoryToggle?.addEventListener(
    "change",
    handleMemoryToggle
  );


  /* Memory */

  elements.clearMemoryBtn?.addEventListener(
    "click",
    clearAllMemory
  );


  /* Navigation */

  $$(".sidebar-nav button").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const action =
          button.dataset.action;

        if (action === "settings") {
          openModal("settings");
        }

        if (action === "memory") {
          openModal("memory");
          loadMemory();
        }

        if (action === "account") {
          openModal("account");
        }

      }
    );

  });


  /* Quick prompts */

  $$(".quick-card").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const prompt =
          button.dataset.prompt || "";

        elements.messageInput.value = prompt;

        autoResizeTextarea();
        updateCharacterCounter();
        updateComposerState();

        elements.messageInput.focus();

      }
    );

  });


  /* Close modals */

  $$("[data-close]").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        closeModal(
          button.dataset.close
        );

      }
    );

  });


  /* Confirm */

  elements.confirmCancel?.addEventListener(
    "click",
    closeConfirm
  );


  /* Retry */

  elements.retryConnectionBtn?.addEventListener(
    "click",
    updateOnlineState
  );


  /* Outside click */

  document.addEventListener(
    "click",
    handleDocumentClick
  );


  /* Network */

  window.addEventListener(
    "online",
    updateOnlineState
  );

  window.addEventListener(
    "offline",
    updateOnlineState
  );
}


/* =========================================================
   SESSION / KAISOUL ID
========================================================= */

async function loadSession() {

  try {

    const response =
      await fetch(
        `${CONFIG.API_BASE}/auth/me`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        }
      );


    if (response.status === 401) {

      setGuestState();

      return;

    }


    if (!response.ok) {

      throw new Error(
        "Không thể kiểm tra phiên đăng nhập."
      );

    }


    const data =
      await response.json();


    if (!data?.user) {

      setGuestState();

      return;

    }


    state.user = data.user;

    state.plan =
      data.plan ||
      data.user.plan ||
      "FREE";


    updateAccountUI();


    await Promise.all([
      loadQuota(),
      loadChats(),
      loadSettings()
    ]);


    if (state.currentChatId) {

      await loadChat(
        state.currentChatId
      );

    }


  } catch (error) {

    console.error(error);

    /*
      Backend chưa chạy thì frontend
      vẫn hiển thị được.
    */

    setGuestState();

    showToast(
      "Chưa kết nối được KAISOUL AI Backend."
    );

  }
}


function setGuestState() {

  state.user = null;
  state.plan = "FREE";

  elements.accountName.textContent =
    "KAISOUL ID";

  elements.accountUsername.textContent =
    "Chưa kết nối";

  elements.accountPlan.textContent =
    "FREE";

  elements.planName.textContent =
    "KAISOUL FREE";

  elements.planStatus.textContent =
    "FREE";

  elements.profileName.textContent =
    "Chưa đăng nhập";

  elements.profileUsername.textContent =
    "";

  elements.profileKaisoulId.textContent =
    "Chưa có";

}


/* =========================================================
   ACCOUNT UI
========================================================= */

function updateAccountUI() {

  if (!state.user) return;


  const user =
    state.user;


  elements.accountName.textContent =
    user.displayName ||
    user.name ||
    "KAISOUL User";


  elements.accountUsername.textContent =
    user.username
      ? `@${String(user.username).replace(/^@/, "")}`
      : "";


  elements.accountPlan.textContent =
    state.plan;


  elements.planName.textContent =
    state.plan === "PRO"
      ? "KAISOUL PRO 1"
      : "KAISOUL FREE";


  elements.planStatus.textContent =
    state.plan;


  const avatar =
    user.avatarUrl ||
    user.avatar ||
    null;


  setAvatar(
    elements.accountAvatar,
    avatar,
    "K"
  );


  setAvatar(
    elements.profileAvatar,
    avatar,
    "K"
  );


  elements.profileName.textContent =
    user.displayName ||
    user.name ||
    "KAISOUL User";


  elements.profileUsername.textContent =
    user.username
      ? `@${String(user.username).replace(/^@/, "")}`
      : "";


  elements.profileKaisoulId.textContent =
    user.kaisoulId ||
    user.kaisoul_id ||
    "Đang tải...";
}


function setAvatar(
  element,
  url,
  fallback
) {

  if (!element) return;

  element.innerHTML = "";

  if (url) {

    const img =
      document.createElement("img");

    img.src = url;
    img.alt = "";

    img.onerror = () => {

      element.textContent =
        fallback;

    };

    element.appendChild(img);

  } else {

    element.textContent =
      fallback;

  }
}


/* =========================================================
   QUOTA
========================================================= */

async function loadQuota() {

  try {

    const response =
      await fetch(
        `${CONFIG.API_BASE}/usage`,
        {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        "Không thể tải quota."
      );

    }


    const data =
      await response.json();


    state.quota = {

      used:
        Number(data.used ?? 0),

      limit:
        Number(
          data.limit ??
          CONFIG.FREE_DAILY_LIMIT
        ),

      remaining:
        Number(
          data.remaining ??
          Math.max(
            0,
            (data.limit ?? CONFIG.FREE_DAILY_LIMIT) -
            (data.used ?? 0)
          )
        )

    };


    updateQuotaUI();


  } catch (error) {

    console.warn(
      "Quota unavailable:",
      error
    );

    /*
      Không dùng giá trị frontend để
      cấp quyền thực tế.
    */

    state.quota = {
      used: 0,
      limit: CONFIG.FREE_DAILY_LIMIT,
      remaining: CONFIG.FREE_DAILY_LIMIT
    };

    updateQuotaUI();

  }
}


function updateQuotaUI() {

  const used =
    Math.max(0, state.quota.used);

  const limit =
    Math.max(1, state.quota.limit);

  const percent =
    Math.min(
      100,
      Math.max(
        0,
        (used / limit) * 100
      )
    );


  elements.quotaText.textContent =
    `${used} / ${limit}`;


  elements.quotaBar.style.width =
    `${percent}%`;


  /*
    PRO không hiển thị FREE limit
    nếu backend trả quota riêng.
  */

  if (state.plan === "PRO") {

    elements.planName.textContent =
      "KAISOUL PRO 1";

  }

}


/* =========================================================
   CHAT HISTORY
========================================================= */

async function loadChats() {

  try {

    const response =
      await fetch(
        `${CONFIG.API_BASE}/chats`,
        {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        "Không thể tải lịch sử."
      );

    }


    const data =
      await response.json();


    state.chats =
      Array.isArray(data)
        ? data
        : (data.chats || []);


    renderHistory();


  } catch (error) {

    console.warn(
      "History unavailable:",
      error
    );

    state.chats = [];

    renderEmptyHistory();

  }
}


function renderHistory() {

  const query =
    elements.historySearch.value
      .trim()
      .toLowerCase();


  const chats =
    state.chats.filter(chat => {

      if (!query) return true;

      return String(
        chat.title || ""
      )
        .toLowerCase()
        .includes(query);

    });


  elements.historyList.innerHTML = "";


  if (!chats.length) {

    renderEmptyHistory(
      query
        ? "Không tìm thấy chat."
        : "Chưa có cuộc trò chuyện nào."
    );

    return;

  }


  elements.historyEmpty.classList.add(
    "hidden"
  );


  chats.forEach(chat => {

    const item =
      document.createElement("button");

    item.type = "button";

    item.className =
      "history-item";


    if (
      String(chat.id) ===
      String(state.currentChatId)
    ) {

      item.classList.add("active");

    }


    const title =
      document.createElement("span");

    title.className =
      "history-item-title";

    title.textContent =
      chat.title ||
      "Chat mới";


    const time =
      document.createElement("span");

    time.className =
      "history-item-time";

    time.textContent =
      formatRelativeTime(
        chat.updatedAt ||
        chat.updated_at
      );


    item.appendChild(title);
    item.appendChild(time);


    item.addEventListener(
      "click",
      async () => {

        closeSidebar();

        await loadChat(chat.id);

      }
    );


    elements.historyList.appendChild(
      item
    );

  });

}


function renderEmptyHistory(
  text = "Chưa có cuộc trò chuyện nào."
) {

  elements.historyList.innerHTML = "";

  elements.historyEmpty.textContent =
    text;

  elements.historyEmpty.classList.remove(
    "hidden"
  );

}


async function createNewChat() {

  if (state.isGenerating) {

    showToast(
      "Hãy dừng câu trả lời hiện tại trước."
    );

    return;

  }


  state.currentChatId = null;
  state.messages = [];


  elements.chatTitle.textContent =
    "Chat mới";


  elements.messages.innerHTML = "";

  elements.welcomeScreen.classList.remove(
    "hidden"
  );


  closeSidebar();

  elements.messageInput.value = "";

  updateCharacterCounter();
  updateComposerState();


  renderHistory();

  elements.messageInput.focus();

}


/* =========================================================
   LOAD CHAT
========================================================= */

async function loadChat(chatId) {

  if (!chatId) return;


  try {

    const response =
      await fetch(
        `${CONFIG.API_BASE}/chats/${encodeURIComponent(chatId)}`,
        {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        "Không thể tải cuộc trò chuyện."
      );

    }


    const data =
      await response.json();


    state.currentChatId =
      data.chat?.id ||
      chatId;


    state.messages =
      Array.isArray(data.messages)
        ? data.messages
        : [];


    elements.chatTitle.textContent =
      data.chat?.title ||
      findChatTitle(chatId) ||
      "Chat mới";


    renderMessages();


    elements.welcomeScreen.classList.toggle(
      "hidden",
      state.messages.length > 0
    );


    renderHistory();


    scrollToBottom();


  } catch (error) {

    console.error(error);

    showToast(
      "Không thể tải cuộc trò chuyện."
    );

  }

}


function findChatTitle(chatId) {

  const chat =
    state.chats.find(
      item =>
        String(item.id) ===
        String(chatId)
    );

  return chat?.title || null;

}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

  if (state.isGenerating) return;


  const text =
    elements.messageInput.value.trim();


  if (!text && !state.selectedFiles.length) {

    showToast(
      "Hãy nhập tin nhắn trước khi gửi."
    );

    return;

  }


  if (
    text.length >
    CONFIG.MAX_MESSAGE_LENGTH
  ) {

    showToast(
      `Tin nhắn tối đa ${CONFIG.MAX_MESSAGE_LENGTH} ký tự.`
    );

    return;

  }


  if (!navigator.onLine) {

    showToast(
      "Bạn đang offline."
    );

    return;

  }


  /*
    File ảnh / file nâng cao có thể yêu cầu
    PRO. Quyết định thực tế phải từ backend.
  */

  const userMessage = {

    id:
      cryptoRandomId(),

    role:
      "user",

    content:
      text,

    files:
      state.selectedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      })),

    createdAt:
      new Date().toISOString()

  };


  appendMessage(
    userMessage
  );


  state.messages.push(
    userMessage
  );


  elements.messageInput.value = "";

  autoResizeTextarea();
  updateCharacterCounter();
  updateComposerState();


  elements.welcomeScreen.classList.add(
    "hidden"
  );


  clearSelectedFiles();


  await requestAI(
    text,
    userMessage.files
  );

}


/* =========================================================
   AI REQUEST + STREAMING
========================================================= */

async function requestAI(
  text,
  files = []
) {

  state.isGenerating = true;

  state.abortController =
    new AbortController();


  setGeneratingUI(true);


  /*
    Tạo assistant message rỗng để
    streaming từng phần.
  */

  const assistantMessage = {

    id:
      cryptoRandomId(),

    role:
      "assistant",

    content:
      "",

    createdAt:
      new Date().toISOString()

  };


  state.messages.push(
    assistantMessage
  );


  const messageElement =
    createMessageElement(
      assistantMessage
    );


  elements.messages.appendChild(
    messageElement
  );


  const contentElement =
    messageElement.querySelector(
      ".message-content"
    );


  try {

    const response =
      await fetch(
        `${CONFIG.API_BASE}/chat`,
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream, application/json"
          },

          body: JSON.stringify({

            chatId:
              state.currentChatId,

            message:
              text,

            files,

            memoryEnabled:
              state.memoryEnabled

          }),

          signal:
            state.abortController.signal

        }
      );


    /*
      Backend có thể trả quota error.
    */

    if (response.status === 429) {

      const data =
        await safeJson(response);


      throw new QuotaError(
        data?.message ||
        "Bạn đã hết hạn mức sử dụng."
      );

    }


    if (response.status === 403) {

      const data =
        await safeJson(response);


      throw new ProRequiredError(
        data?.message ||
        "Tính năng này yêu cầu KAISOUL PRO 1."
      );

    }


    if (!response.ok) {

      const data =
        await safeJson(response);


      throw new Error(
        data?.message ||
        "KAISOUL AI không thể trả lời lúc này."
      );

    }


    /*
      Backend có thể trả JSON hoàn chỉnh
      hoặc stream.
    */

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";


    if (
      contentType.includes(
        "text/event-stream"
      )
    ) {

      await consumeSSE(
        response,
        assistantMessage,
        contentElement
      );

    } else {

      const data =
        await response.json();


      const answer =
        data.answer ||
        data.content ||
        data.message ||
        "";


      assistantMessage.content =
        answer;


      renderMessageContent(
        contentElement,
        answer
      );

    }


    /*
      Backend có thể tạo chat mới
      trong lần gửi đầu tiên.
    */

    if (response.headers.get("x-chat-id")) {

      state.currentChatId =
        response.headers.get(
          "x-chat-id"
        );

    }


    /*
      Nếu JSON stream cuối có chatId,
      consumeSSE sẽ cập nhật.
    */

    if (
      assistantMessage.content
    ) {

      updateMessageActions(
        messageElement,
        assistantMessage
      );

    }


    await loadQuota();
    await loadChats();


  } catch (error) {

    if (
      error.name === "AbortError"
    ) {

      if (
        !assistantMessage.content
      ) {

        assistantMessage.content =
          "Đã dừng.";

      }


      renderMessageContent(
        contentElement,
        assistantMessage.content
      );


    } else {

      console.error(
        "AI request error:",
        error
      );


      /*
        Xóa assistant rỗng khỏi state nếu lỗi.
      */

      if (
        !assistantMessage.content
      ) {

        const index =
          state.messages.indexOf(
            assistantMessage
          );

        if (index !== -1) {

          state.messages.splice(
            index,
            1
          );

        }


        messageElement.remove();

      }


      showErrorMessage(
        error
      );

    }

  } finally {

    state.isGenerating = false;
    state.abortController = null;

    setGeneratingUI(false);

    scrollToBottom();

  }

}


/* =========================================================
   SERVER-SENT EVENTS
========================================================= */

async function consumeSSE(
  response,
  assistantMessage,
  contentElement
) {

  if (!response.body) {

    throw new Error(
      "Backend không hỗ trợ streaming."
    );

  }


  const reader =
    response.body.getReader();


  const decoder =
    new TextDecoder("utf-8");


  let buffer = "";


  while (true) {

    const {
      value,
      done
    } =
      await reader.read();


    if (done) break;


    buffer +=
      decoder.decode(
        value,
        { stream: true }
      );


    const events =
      buffer.split("\n\n");


    buffer =
      events.pop() || "";


    for (const event of events) {

      processSSEEvent(
        event,
        assistantMessage,
        contentElement
      );

    }


    scrollToBottom();

  }


  if (buffer.trim()) {

    processSSEEvent(
      buffer,
      assistantMessage,
      contentElement
    );

  }

}


function processSSEEvent(
  event,
  assistantMessage,
  contentElement
) {

  const lines =
    event.split("\n");


  let eventType =
    "message";

  let dataText =
    "";


  for (const line of lines) {

    if (
      line.startsWith("event:")
    ) {

      eventType =
        line.slice(6).trim();

    }


    if (
      line.startsWith("data:")
    ) {

      dataText +=
        line.slice(5).trim();

    }

  }


  if (!dataText) return;


  if (dataText === "[DONE]") {

    return;

  }


  let data;


  try {

    data =
      JSON.parse(dataText);

  } catch {

    data = {
      content:
        dataText
    };

  }


  if (data.chatId) {

    state.currentChatId =
      data.chatId;

  }


  if (
    eventType === "error"
  ) {

    throw new Error(
      data.message ||
      "Streaming error."
    );

  }


  const delta =
    data.delta ??
    data.content ??
    data.text ??
    "";


  if (!delta) return;


  assistantMessage.content +=
    delta;


  renderMessageContent(
    contentElement,
    assistantMessage.content
  );


  updateMessageActions(
    contentElement.closest(".message"),
    assistantMessage
  );

}


/* =========================================================
   STOP
========================================================= */

function stopGeneration() {

  if (
    !state.isGenerating ||
    !state.abortController
  ) {

    return;

  }


  state.abortController.abort();

}


/* =========================================================
   GENERATING UI
========================================================= */

function setGeneratingUI(
  generating
) {

  state.isGenerating =
    generating;


  elements.sendBtn.classList.toggle(
    "hidden",
    generating
  );


  elements.stopBtn.classList.toggle(
    "hidden",
    !generating
  );


  elements.typingIndicator.classList.toggle(
    "hidden",
    !generating
  );


  if (generating) {

    elements.messageInput.disabled =
      true;

    elements.attachBtn.disabled =
      true;

  } else {

    elements.messageInput.disabled =
      false;

    elements.attachBtn.disabled =
      false;

  }


  updateComposerState();

  if (generating) {

    scrollToBottom();

  }

}


/* =========================================================
   RENDER MESSAGES
========================================================= */

function renderMessages() {

  elements.messages.innerHTML = "";


  for (
    const message of state.messages
  ) {

    elements.messages.appendChild(
      createMessageElement(message)
    );

  }


  elements.welcomeScreen.classList.toggle(
    "hidden",
    state.messages.length > 0
  );


  scrollToBottom();

}


function appendMessage(
  message
) {

  const element =
    createMessageElement(
      message
    );


  elements.messages.appendChild(
    element
  );


  scrollToBottom();

}


function createMessageElement(
  message
) {

  const wrapper =
    document.createElement("article");


  wrapper.className =
    `message ${message.role === "user" ? "user" : "assistant"}`;


  wrapper.dataset.messageId =
    message.id || "";


  const avatar =
    document.createElement("div");


  avatar.className =
    "message-avatar";


  if (
    message.role === "user" &&
    state.user?.avatarUrl
  ) {

    setAvatar(
      avatar,
      state.user.avatarUrl,
      "U"
    );

  } else {

    avatar.textContent =
      message.role === "user"
        ? "U"
        : "K";

  }


  const body =
    document.createElement("div");


  body.className =
    "message-body";


  const content =
    document.createElement("div");


  content.className =
    "message-content";


  renderMessageContent(
    content,
    message.content || ""
  );


  const time =
    document.createElement("div");


  time.className =
    "message-time";


  time.textContent =
    formatMessageTime(
      message.createdAt ||
      message.created_at
    );


  body.appendChild(
    content
  );

  body.appendChild(
    time
  );


  if (
    message.role === "assistant"
  ) {

    const actions =
      createMessageActions(
        message
      );

    body.appendChild(
      actions
    );

  }


  wrapper.appendChild(
    avatar
  );

  wrapper.appendChild(
    body
  );


  return wrapper;

}


/* =========================================================
   MARKDOWN RENDERER
========================================================= */

function renderMessageContent(
  element,
  text
) {

  element.innerHTML =
    renderMarkdown(
      text || ""
    );

  addCopyCodeButtons(
    element
  );

}


function renderMarkdown(
  text
) {

  /*
    Renderer cơ bản, không dùng thư viện ngoài.
    Escape HTML trước để tránh XSS.
  */

  let safe =
    escapeHtml(
      String(text)
    );


  /*
    Code blocks
  */

  safe =
    safe.replace(
      /```([\w+-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {

        const lang =
          language ||
          "code";


        return `
          <div class="code-block">
            <div class="code-header">
              <span>${escapeHtml(lang)}</span>
              <button
                class="copy-code-btn"
                type="button">
                Copy
              </button>
            </div>
            <pre><code>${code.trim()}</code></pre>
          </div>
        `;

      }
    );


  /*
    Inline code
  */

  safe =
    safe.replace(
      /`([^`\n]+)`/g,
      "<code>$1</code>"
    );


  /*
    Bold
  */

  safe =
    safe.replace(
      /\*\*([^*]+)\*\*/g,
      "<strong>$1</strong>"
    );


  /*
    Italic
  */

  safe =
    safe.replace(
      /(^|[^\*])\*([^*\n]+)\*(?!\*)/g,
      "$1<em>$2</em>"
    );


  /*
    Headings
  */

  safe =
    safe.replace(
      /^### (.+)$/gm,
      "<strong>$1</strong>"
    );

  safe =
    safe.replace(
      /^## (.+)$/gm,
      "<strong>$1</strong>"
    );

  safe =
    safe.replace(
      /^# (.+)$/gm,
      "<strong>$1</strong>"
    );


  /*
    Links
  */

  safe =
    safe.replace(
      /(^|[\s>])(https?:\/\/[^\s<]+)/g,
      '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
    );


  /*
    Lists
  */

  safe =
    safe.replace(
      /^\s*[-*] (.+)$/gm,
      "<li>$1</li>"
    );


  safe =
    safe.replace(
      /(<li>.*<\/li>)/gs,
      "<ul>$1</ul>"
    );


  /*
    Paragraphs / line breaks.
  */

  const blocks =
    safe.split(/\n{2,}/);


  return blocks
    .map(block => {

      if (
        block.startsWith("<div class=\"code-block\">")
      ) {

        return block;

      }


      if (
        block.startsWith("<ul>")
      ) {

        return block;

      }


      return `<p>${block.replace(/\n/g, "<br>")}</p>`;

    })
    .join("");

}


function escapeHtml(
  value
) {

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   COPY
========================================================= */

function addCopyCodeButtons(
  container
) {

  container
    .querySelectorAll(
      ".copy-code-btn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const code =
            button
              .closest(".code-block")
              ?.querySelector("code")
              ?.textContent || "";


          try {

            await navigator.clipboard.writeText(
              code
            );

            button.textContent =
              "Đã copy";


            setTimeout(
              () => {
                button.textContent =
                  "Copy";
              },
              1200
            );

          } catch {

            showToast(
              "Không thể copy."
            );

          }

        }
      );

    });

}


function copyMessage(
  message
) {

  navigator.clipboard
    .writeText(
      message.content || ""
    )
    .then(
      () => showToast("Đã copy nội dung.")
    )
    .catch(
      () => showToast("Không thể copy.")
    );

}


/* =========================================================
   MESSAGE ACTIONS
========================================================= */

function createMessageActions(
  message
) {

  const actions =
    document.createElement("div");


  actions.className =
    "message-actions";


  const copy =
    document.createElement("button");

  copy.type = "button";
  copy.textContent = "Copy";


  copy.addEventListener(
    "click",
    () => copyMessage(message)
  );


  const regenerate =
    document.createElement("button");

  regenerate.type = "button";
  regenerate.textContent = "Tạo lại";


  regenerate.addEventListener(
    "click",
    () => regenerateMessage(message)
  );


  actions.appendChild(copy);
  actions.appendChild(regenerate);


  return actions;

}


function updateMessageActions(
  messageElement,
  message
) {

  if (!messageElement) return;


  const body =
    messageElement.querySelector(
      ".message-body"
    );


  if (!body) return;


  const old =
    body.querySelector(
      ".message-actions"
    );


  if (old) old.remove();


  body.appendChild(
    createMessageActions(
      message
    )
  );

}


async function regenerateMessage(
  assistantMessage
) {

  if (state.isGenerating) return;


  const index =
    state.messages.indexOf(
      assistantMessage
    );


  if (index === -1) return;


  let userMessage = null;


  for (
    let i = index - 1;
    i >= 0;
    i--
  ) {

    if (
      state.messages[i].role === "user"
    ) {

      userMessage =
        state.messages[i];

      break;

    }

  }


  if (!userMessage) {

    showToast(
      "Không tìm thấy tin nhắn cần tạo lại."
    );

    return;

  }


  state.messages.splice(
    index,
    1
  );


  const element =
    elements.messages.querySelector(
      `[data-message-id="${assistantMessage.id}"]`
    );


  element?.remove();


  await requestAI(
    userMessage.content,
    userMessage.files || []
  );

}


/* =========================================================
   FILE HANDLING
========================================================= */

function handleFileSelection(
  event
) {

  const files =
    Array.from(
      event.target.files || []
    );


  for (const file of files) {

    const validation =
      validateFile(file);


    if (!validation.valid) {

      showToast(
        validation.message
      );

      continue;

    }


    if (
      state.selectedFiles.some(
        existing =>
          existing.name === file.name &&
          existing.size === file.size
      )
    ) {

      continue;

    }


    state.selectedFiles.push(
      file
    );

  }


  renderFilePreview();

  event.target.value = "";

}


function validateFile(
  file
) {

  const sizeMb =
    file.size /
    1024 /
    1024;


  if (
    sizeMb >
    CONFIG.MAX_FILE_SIZE_MB
  ) {

    return {
      valid: false,
      message:
        `${file.name}: tối đa ${CONFIG.MAX_FILE_SIZE_MB}MB.`
    };

  }


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  const allowed =
    CONFIG.ALLOWED_EXTENSIONS.includes(
      extension
    ) ||
    CONFIG.ALLOWED_IMAGE_TYPES.includes(
      file.type
    );


  if (!allowed) {

    return {
      valid: false,
      message:
        `${file.name}: định dạng chưa được hỗ trợ.`
    };

  }


  /*
    Quyền PRO phải được backend kiểm tra.
  */

  if (
    CONFIG.ALLOWED_IMAGE_TYPES.includes(
      file.type
    ) &&
    state.plan !== "PRO"
  ) {

    showToast(
      "Phân tích hình ảnh yêu cầu KAISOUL PRO 1."
    );

    return {
      valid: false,
      message:
        "Image requires PRO."
    };

  }


  return {
    valid: true
  };

}


function renderFilePreview() {

  elements.filePreview.innerHTML = "";


  if (!state.selectedFiles.length) {

    elements.filePreview.classList.add(
      "hidden"
    );

    return;

  }


  elements.filePreview.classList.remove(
    "hidden"
  );


  state.selectedFiles.forEach(
    (file, index) => {

      const chip =
        document.createElement("div");

      chip.className =
        "file-chip";


      const name =
        document.createElement("span");

      name.className =
        "file-chip-name";

      name.textContent =
        file.name;


      const remove =
        document.createElement("button");

      remove.type = "button";

      remove.className =
        "file-chip-remove";

      remove.textContent =
        "×";


      remove.addEventListener(
        "click",
        () => {

          state.selectedFiles.splice(
            index,
            1
          );

          renderFilePreview();

        }
      );


      chip.appendChild(name);
      chip.appendChild(remove);

      elements.filePreview.appendChild(
        chip
      );

    }
  );

}


function clearSelectedFiles() {

  state.selectedFiles = [];

  elements.filePreview.innerHTML = "";

  elements.filePreview.classList.add(
    "hidden"
  );

}


/* =========================================================
   INPUT
========================================================= */

function handleInputKeydown(
  event
) {

  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {

    event.preventDefault();

    sendMessage();

  }

}


function autoResizeTextarea() {

  const textarea =
    elements.messageInput;


  if (!textarea) return;


  textarea.style.height =
    "auto";


  textarea.style.height =
    Math.min(
      textarea.scrollHeight,
      180
    ) + "px";

}


function updateCharacterCounter() {

  const length =
    elements.messageInput.value.length;


  elements.messageCounter.textContent =
    `${length} / ${CONFIG.MAX_MESSAGE_LENGTH}`;

}


function updateComposerState() {

  const hasText =
    elements.messageInput.value.trim().length > 0;


  const hasFiles =
    state.selectedFiles.length > 0;


  elements.sendBtn.disabled =
    state.isGenerating ||
    (!hasText && !hasFiles);

}


/* =========================================================
   SETTINGS
========================================================= */

function loadLocalSettings() {

  try {

    const saved =
      localStorage.getItem(
        "kaisoul_ai_settings"
      );


    if (!saved) return;


    const settings =
      JSON.parse(saved);


    if (settings.theme) {

      state.settings.theme =
        settings.theme;

    }


    if (
      typeof settings.notifications ===
      "boolean"
    ) {

      state.settings.notifications =
        settings.notifications;

    }


    if (
      typeof settings.memoryEnabled ===
      "boolean"
    ) {

      state.memoryEnabled =
        settings.memoryEnabled;

    }


  } catch (error) {

    console.warn(
      "Settings load error:",
      error
    );

  }

}


async function loadSettings() {

  try {

    const response =
      await fetch(
        `${CONFIG.API_BASE}/settings`,
        {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        }
      );


    if (!response.ok) return;


    const data =
      await response.json();


    const settings =
      data.settings ||
      data;


    if (settings.theme) {

      state.settings.theme =
        settings.theme;

    }


    if (
      typeof settings.notifications ===
      "boolean"
    ) {

      state.settings.notifications =
        settings.notifications;

    }


    if (
      typeof settings.memoryEnabled ===
      "boolean"
    ) {

      state.memoryEnabled =
        settings.memoryEnabled;

    }


    applySettingsUI();


  } catch (error) {

    console.warn(
      "Remote settings unavailable:",
      error
    );

    applySettingsUI();

  }

}


function saveLocalSettings() {

  localStorage.setItem(
    "kaisoul_ai_settings",
    JSON.stringify({
      theme:
        state.settings.theme,

      notifications:
        state.settings.notifications,

      memoryEnabled:
        state.memoryEnabled
    })
  );

}


function applySettingsUI() {

  elements.themeSelect.value =
    state.settings.theme;


  elements.notificationToggle.checked =
    state.settings.notifications;


  elements.memoryToggle.checked =
    state.memoryEnabled;


  applyTheme();

}


function applyTheme() {

  let theme =
    state.settings.theme;


  if (theme === "system") {

    theme =
      window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches
        ? "light"
        : "dark";

  }


  document.body.classList.toggle(
    "light",
    theme === "light"
  );

}


function handleThemeChange(
  event
) {

  state.settings.theme =
    event.target.value;

  saveLocalSettings();
  applyTheme();
  syncSettings();

}


function handleNotificationChange(
  event
) {

  state.settings.notifications =
    event.target.checked;

  saveLocalSettings();
  syncSettings();

}


function handleMemoryToggle(
  event
) {

  state.memoryEnabled =
    event.target.checked;

  saveLocalSettings();
  syncSettings();

}


async function syncSettings() {

  try {

    await fetch(
      `${CONFIG.API_BASE}/settings`,
      {
        method: "PUT",

        credentials: "include",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          theme:
            state.settings.theme,

          notifications:
            state.settings.notifications,

          memoryEnabled:
            state.memoryEnabled

        })

      }
    );

  } catch (error) {

    console.warn(
      "Settings sync failed:",
      error
    );

  }

}


/* =========================================================
   MEMORY
========================================================= */

async function loadMemory() {

  elements.memoryList.innerHTML = "";

  elements.memoryEmpty.classList.add(
    "hidden"
  );


  try {

    const response =
      await fetch(
        `${CONFIG.API_BASE}/memory`,
        {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        "Không thể tải memory."
      );

    }


    const data =
      await response.json();


    const memories =
      Array.isArray(data)
        ? data
        : (data.memories || []);


    if (!memories.length) {

      elements.memoryEmpty.classList.remove(
        "hidden"
      );

      return;

    }


    memories.forEach(
      memory =>
        renderMemoryItem(memory)
    );


  } catch (error) {

    console.warn(error);

    elements.memoryEmpty.textContent =
      "Không thể tải memory.";

    elements.memoryEmpty.classList.remove(
      "hidden"
    );

  }

}


function renderMemoryItem(
  memory
) {

  const item =
    document.createElement("div");

  item.className =
    "memory-item";


  const content =
    document.createElement("div");

  content.className =
    "memory-item-content";

  content.textContent =
    memory.content ||
    memory.text ||
    "";


  const footer =
    document.createElement("div");

  footer.className =
    "memory-item-footer";


  const deleteBtn =
    document.createElement("button");

  deleteBtn.type = "button";

  deleteBtn.className =
    "memory-delete";

  deleteBtn.textContent =
    "Xóa";


  deleteBtn.addEventListener(
    "click",
    () =>
      deleteMemory(
        memory.id
      )
  );


  footer.appendChild(
    deleteBtn
  );


  item.appendChild(
    content
  );

  item.appendChild(
    footer
  );


  elements.memoryList.appendChild(
    item
  );

}


async function deleteMemory(
  memoryId
) {

  if (!memoryId) return;


  try {

    const response =
      await fetch(
        `${CONFIG.API_BASE}/memory/${encodeURIComponent(memoryId)}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Không thể xóa memory."
      );

    }


    showToast(
      "Đã xóa memory."
    );


    loadMemory();


  } catch (error) {

    showToast(
      error.message
    );

  }

}


async function clearAllMemory() {

  openConfirm(
    "Xóa toàn bộ memory?",
    "Tất cả memory đã lưu sẽ bị xóa.",
    async () => {

      try {

        const response =
          await fetch(
            `${CONFIG.API_BASE}/memory`,
            {
              method: "DELETE",
              credentials: "include"
            }
          );


        if (!response.ok) {

          throw new Error(
            "Không thể xóa memory."
          );

        }


        showToast(
          "Đã xóa toàn bộ memory."
        );


        loadMemory();


      } catch (error) {

        showToast(
          error.message
        );

      }

    }
  );

}


/* =========================================================
   MODALS
========================================================= */

function openModal(
  name
) {

  const map = {
    settings:
      elements.settingsModal,

    memory:
      elements.memoryModal,

    pro:
      elements.proModal,

    account:
      elements.accountModal
  };


  const modal =
    map[name];


  if (!modal) return;


  modal.classList.remove(
    "hidden"
  );


  if (name === "account") {

    /*
      Cập nhật thông tin mới nhất
      nếu đã có user.
    */

    updateAccountUI();

  }

}


function closeModal(
  name
) {

  const map = {
    settings:
      elements.settingsModal,

    memory:
      elements.memoryModal,

    pro:
      elements.proModal,

    account:
      elements.accountModal
  };


  map[name]?.classList.add(
    "hidden"
  );

}


function toggleMoreMenu() {

  elements.moreMenu.classList.toggle(
    "hidden"
  );

}


function handleDocumentClick(
  event
) {

  if (
    !elements.moreMenu.contains(
      event.target
    ) &&
    !elements.moreBtn.contains(
      event.target
    )
  ) {

    elements.moreMenu.classList.add(
      "hidden"
    );

  }


  const moreAction =
    event.target.closest(
      "[data-more]"
    );


  if (moreAction) {

    handleMoreAction(
      moreAction.dataset.more
    );

  }

}


async function handleMoreAction(
  action
) {

  elements.moreMenu.classList.add(
    "hidden"
  );


  if (action === "rename") {

    await renameCurrentChat();

  }


  if (action === "clear") {

    await deleteCurrentChat();

  }


  if (action === "regenerate") {

    const lastAssistant =
      [...state.messages]
        .reverse()
        .find(
          message =>
            message.role === "assistant"
        );


    if (lastAssistant) {

      await regenerateMessage(
        lastAssistant
      );

    } else {

      showToast(
        "Chưa có câu trả lời để tạo lại."
      );

    }

  }

}


/* =========================================================
   RENAME CHAT
========================================================= */

async function renameCurrentChat() {

  if (!state.currentChatId) {

    showToast(
      "Chưa có cuộc trò chuyện để đổi tên."
    );

    return;

  }


  const current =
    elements.chatTitle.textContent ||
    "Chat mới";


  const title =
    window.prompt(
      "Tên cuộc trò chuyện:",
      current
    );


  if (
    title === null
  ) return;


  const clean =
    title.trim();


  if (!clean) {

    showToast(
      "Tên chat không được để trống."
    );

    return;

  }


  try {

    const response =
      await fetch(
        `${CONFIG.API_BASE}/chats/${encodeURIComponent(state.currentChatId)}`,
        {
          method: "PATCH",

          credentials: "include",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            title: clean
          })

        }
      );


    if (!response.ok) {

      throw new Error(
        "Không thể đổi tên chat."
      );

    }


    elements.chatTitle.textContent =
      clean;


    await loadChats();


    showToast(
      "Đã đổi tên chat."
    );


  } catch (error) {

    showToast(
      error.message
    );

  }

}


/* =========================================================
   DELETE CHAT
========================================================= */

async function deleteCurrentChat() {

  if (!state.currentChatId) {

    showToast(
      "Chưa có cuộc trò chuyện để xóa."
    );

    return;

  }


  openConfirm(
    "Xóa cuộc trò chuyện?",
    "Cuộc trò chuyện này sẽ bị xóa.",
    async () => {

      try {

        const response =
          await fetch(
            `${CONFIG.API_BASE}/chats/${encodeURIComponent(state.currentChatId)}`,
            {
              method: "DELETE",
              credentials: "include"
            }
          );


        if (!response.ok) {

          throw new Error(
            "Không thể xóa chat."
          );

        }


        showToast(
          "Đã xóa cuộc trò chuyện."
        );


        await createNewChat();

        await loadChats();


      } catch (error) {

        showToast(
          error.message
        );

      }

    }
  );

}


/* =========================================================
   CONFIRM
========================================================= */

let confirmCallback =
  null;


function openConfirm(
  title,
  message,
  callback
) {

  elements.confirmTitle.textContent =
    title;

  elements.confirmMessage.textContent =
    message;


  confirmCallback =
    callback;


  elements.confirmModal.classList.remove(
    "hidden"
  );


  elements.confirmOk.onclick =
    async () => {

      const fn =
        confirmCallback;

      closeConfirm();

      if (fn) {

        await fn();

      }

    };

}


function closeConfirm() {

  elements.confirmModal.classList.add(
    "hidden"
  );

  confirmCallback =
    null;

}


/* =========================================================
   SIDEBAR
========================================================= */

function openSidebar() {

  elements.sidebar.classList.add(
    "open"
  );

  elements.sidebarOverlay.classList.add(
    "active"
  );

}


function closeSidebar() {

  elements.sidebar.classList.remove(
    "open"
  );

  elements.sidebarOverlay.classList.remove(
    "active"
  );

}


/* =========================================================
   ONLINE
========================================================= */

function updateOnlineState() {

  const online =
    navigator.onLine;


  elements.offlineState.classList.toggle(
    "hidden",
    online
  );


  if (online) {

    loadSession()
      .catch(
        error =>
          console.warn(error)
      );

  }

}


/* =========================================================
   ERROR HANDLING
========================================================= */

function showErrorMessage(
  error
) {

  if (
    error instanceof QuotaError
  ) {

    openModal("pro");

    showToast(
      error.message
    );

    return;

  }


  if (
    error instanceof ProRequiredError
  ) {

    openModal("pro");

    showToast(
      error.message
    );

    return;

  }


  showToast(
    error.message ||
    "Đã xảy ra lỗi."
  );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer =
  null;


function showToast(
  message
) {

  if (!elements.toast) return;


  elements.toastMessage.textContent =
    message;


  elements.toast.classList.remove(
    "hidden"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        elements.toast.classList.add(
          "hidden"
        );

      },
      2600
    );

}


/* =========================================================
   SCROLL
========================================================= */

function scrollToBottom() {

  requestAnimationFrame(
    () => {

      elements.chatContainer.scrollTop =
        elements.chatContainer.scrollHeight;

    }
  );

}


/* =========================================================
   DATE / TIME
========================================================= */

function formatMessageTime(
  value
) {

  if (!value) {

    return "";

  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  return date.toLocaleTimeString(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


function formatRelativeTime(
  value
) {

  if (!value) return "";


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  const now =
    Date.now();


  const diff =
    Math.max(
      0,
      now - date.getTime()
    );


  const minutes =
    Math.floor(
      diff / 60000
    );


  if (minutes < 1) {

    return "Vừa xong";

  }


  if (minutes < 60) {

    return `${minutes} phút`;

  }


  const hours =
    Math.floor(
      minutes / 60
    );


  if (hours < 24) {

    return `${hours} giờ`;

  }


  const days =
    Math.floor(
      hours / 24
    );


  if (days < 7) {

    return `${days} ngày`;

  }


  return date.toLocaleDateString(
    "vi-VN"
  );

}


/* =========================================================
   RANDOM ID
========================================================= */

function cryptoRandomId() {

  if (
    window.crypto?.randomUUID
  ) {

    return crypto.randomUUID();

  }


  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2)
  );

}


/* =========================================================
   SAFE JSON
========================================================= */

async function safeJson(
  response
) {

  try {

    return await response.json();

  } catch {

    return null;

  }

}


/* =========================================================
   CUSTOM ERRORS
========================================================= */

class QuotaError
  extends Error {

  constructor(message) {

    super(message);

    this.name =
      "QuotaError";

  }

}


class ProRequiredError
  extends Error {

  constructor(message) {

    super(message);

    this.name =
      "ProRequiredError";

  }

}


/* =========================================================
   SYSTEM PREFERENCE CHANGE
========================================================= */

window
  .matchMedia(
    "(prefers-color-scheme: light)"
  )
  .addEventListener(
    "change",
    () => {

      if (
        state.settings.theme ===
        "system"
      ) {

        applyTheme();

      }

    }
  );


/* =========================================================
   GLOBAL ACCESS
   Useful for debugging only.
========================================================= */

window.KAISOUL_AI = {
  state,

  newChat:
    createNewChat,

  send:
    sendMessage,

  stop:
    stopGeneration,

  loadChats:
    loadChats,

  loadQuota:
    loadQuota

};
