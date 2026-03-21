import { getAllTimeStats } from "./utils/getAllTimeStats";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { buildTableData } from "./utils/buildTableData";
import {
  Trophy,
  Plus,
  Trash2,
  Activity,
  Smartphone,
  Monitor,
  Cloud,
  History,
  RotateCcw,
  Zap,
  X,
  AlertTriangle,
  CheckCircle,
  Edit3,
  Wrench,
  WifiOff,
  KeyRound,
  UserX,
  Swords,
  Image as ImageIcon,
  Edit2,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  ShieldCheck,
  MonitorSmartphone,
  Menu,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  getDoc,
} from "firebase/firestore";

// ==========================================
// CẤU HÌNH PHÒNG DUY NHẤT & MÃ ADMIN
// ==========================================
const ROOM_ID = "PES_CHAMPIONSHIP_MAIN";
const MASTER_PIN = "888888";
// ==========================================

const getFirebaseConfig = () => {
  if (typeof __firebase_config !== "undefined") {
    return JSON.parse(__firebase_config);
  }
  return {
    apiKey: "AIzaSyCEx_ypXDyV3B02U-FZa5Zx1_a2FuM621Y",
    authDomain: "bxh-pes.firebaseapp.com",
    projectId: "bxh-pes",
    storageBucket: "bxh-pes.firebasestorage.app",
    messagingSenderId: "869666370835",
    appId: "1:869666370835:web:304afe1552968976c6d6e6",
    measurementId: "G-28EPFBS27F",
  };
};

const app = initializeApp(getFirebaseConfig());
const auth = getAuth(app);
const db = getFirestore(app);

const appId =
  typeof __app_id !== "undefined" ? __app_id : "pes_sync_production";
const FEE_STEP = 10000;

const DEFAULT_LEAGUES = [
  { id: "A", name: "LEAGUE A", type: "STD", createdAt: 1, isArchived: false },
  { id: "B", name: "LEAGUE B", type: "STD", createdAt: 2, isArchived: false },
  { id: "C1A", name: "C1 BẢNG A", type: "C1", createdAt: 3, isArchived: false },
  { id: "C1B", name: "C1 BẢNG B", type: "C1", createdAt: 4, isArchived: false },
];

const normalizeText = (value = "") =>
  value.toString().trim().replace(/\s+/g, " ").toLowerCase();
const getLeagueType = (leagues, leagueId) =>
  leagues.find((l) => l.id === leagueId)?.type || "STD";

const validateMatchInput = ({
  isC1,
  gh,
  ga,
  winType,
  ph,
  pa,
  homeId,
  awayId,
}) => {
  if (!homeId || !awayId) return "Thiếu thông tin người chơi.";
  if (homeId === awayId) return "Hai người chơi không thể trùng nhau.";
  if (
    Number.isNaN(gh) ||
    Number.isNaN(ga) ||
    gh < 0 ||
    ga < 0 ||
    !Number.isInteger(gh) ||
    !Number.isInteger(ga)
  )
    return "Tỷ số chính phải là số nguyên từ 0 trở lên.";
  if (!isC1) return null;
  if (winType === "90M" && gh === ga)
    return "Luật C1 không cho hòa trong 90 phút.";
  if (winType === "ET" && gh === ga)
    return "Nếu thắng hiệp phụ thì tỷ số cuối phải có đội thắng.";
  if (winType === "PEN") {
    if (gh !== ga) return "Nếu chọn penalty thì tỷ số chính phải hòa.";
    if (
      Number.isNaN(ph) ||
      Number.isNaN(pa) ||
      ph < 0 ||
      pa < 0 ||
      !Number.isInteger(ph) ||
      !Number.isInteger(pa)
    )
      return "Tỷ số penalty phải là số nguyên từ 0 trở lên.";
    if (ph === pa) return "Penalty phải có đội thắng.";
  }
  return null;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("connecting");

  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [leagues, setLeagues] = useState(DEFAULT_LEAGUES);

  const [activeTab, setActiveTab] = useState("ALL");
  const [numLegs, setNumLegs] = useState(2);

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [profileTab, setProfileTab] = useState("FIXTURES");
  const [editingLeague, setEditingLeague] = useState(null);
  const [showDeviceManager, setShowDeviceManager] = useState(false);

  const [dialog, setDialog] = useState(null);
  const hasCheckedEmptyRef = useRef(false);

  const [deviceId] = useState(() => {
    let id = localStorage.getItem("pes_device_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem("pes_device_id", id);
    }
    return id;
  });

  const [isEditor, setIsEditor] = useState(
    () => localStorage.getItem("pes_editor_active") === "true"
  );
  const [isMasterAdmin, setIsMasterAdmin] = useState(
    () => localStorage.getItem("pes_master_admin") === "true"
  );
  const [approvedDevicesList, setApprovedDevicesList] = useState([]);

  const fileInputRef = useRef(null);

  const liveLeagues = useMemo(
    () => leagues.filter((l) => !l.isArchived),
    [leagues]
  );
  const currentLeague = liveLeagues.find((l) => l.id === activeTab);

  // SÁT THỦ DIỆT NÚT SANDBOX (JS Removal)
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      #csb-dev-tools, .csb-dev-tools, .csb-edit-btn, iframe[title*="CodeSandbox"], a[href*="codesandbox"], button[title="Open Sandbox"] { 
        display: none !important; opacity: 0 !important; width: 0 !important; height: 0 !important; position: absolute !important; pointer-events: none !important; z-index: -9999 !important;
      }
    `;
    document.head.appendChild(style);

    const nukeSandbox = () => {
      try {
        const els = document.querySelectorAll("button, a, div, span");
        els.forEach((el) => {
          if (el.innerText && el.innerText.toLowerCase().includes("sandbox")) {
            el.remove();
          }
        });
      } catch (e) {}
    };
    const interval = setInterval(nukeSandbox, 300); // Quét liên tục mỗi 0.3s
    return () => clearInterval(interval);
  }, []);

  const triggerActivateEditor = () => {
    setDialog({
      type: "activation",
      title: "YÊU CẦU CẤP QUYỀN CHỈNH SỬA",
      message:
        "Thiết bị này hiện tại CHỈ XEM.\nĐể có quyền thêm người chơi và nhập tỷ số, hãy gửi mã thiết bị dưới đây cho Admin để được duyệt:",
      deviceId: deviceId,
    });
  };

  const handleAdminLogin = () => {
    setDialog({
      type: "prompt",
      title: "ĐĂNG NHẬP ADMIN",
      message: "Nhập MÃ MASTER PIN (Bí mật):",
      defaultValue: "",
      onConfirm: async (pin) => {
        if (pin.trim() === MASTER_PIN) {
          setIsEditor(true);
          setIsMasterAdmin(true);
          localStorage.setItem("pes_editor_active", "true");
          localStorage.setItem("pes_master_admin", "true");

          try {
            const ref = doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              `${ROOM_ID}_config`,
              "approvals"
            );
            const snap = await getDoc(ref);
            let current = [];
            if (snap.exists()) current = snap.data().approvedDevices || [];
            if (!current.includes(deviceId)) {
              current.push(deviceId);
              await setDoc(ref, { approvedDevices: current }, { merge: true });
            }
          } catch (e) {
            console.error(e);
          }

          setDialog({
            type: "alert",
            title: "THÀNH CÔNG",
            message: "Bạn đã nắm quyền Admin hệ thống!",
          });
        } else {
          setDialog({
            type: "alert",
            title: "THẤT BẠI",
            message: "Mã PIN không chính xác!",
          });
        }
      },
    });
  };

  const handleGrantDeviceAccess = () => {
    setDialog({
      type: "prompt",
      title: "CẤP QUYỀN CHO MÁY KHÁC",
      message:
        "Nhập MÃ THIẾT BỊ (6 ký tự) của người chơi mà bạn muốn cấp quyền nhập tỷ số:",
      defaultValue: "",
      onConfirm: async (code) => {
        const targetCode = code.trim().toUpperCase();
        if (targetCode.length > 0) {
          try {
            const ref = doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              `${ROOM_ID}_config`,
              "approvals"
            );
            const snap = await getDoc(ref);
            let current = [];
            if (snap.exists()) current = snap.data().approvedDevices || [];

            if (!current.includes(targetCode)) {
              current.push(targetCode);
              await setDoc(ref, { approvedDevices: current }, { merge: true });
            }
            setDialog({
              type: "alert",
              title: "CẤP QUYỀN THÀNH CÔNG",
              message: `Thiết bị có mã [${targetCode}] đã có thể chỉnh sửa giải đấu!`,
            });
          } catch (e) {
            setDialog({ type: "alert", title: "LỖI", message: e.message });
          }
        }
      },
    });
  };

  const handleRevokeDevice = async (targetDeviceId) => {
    setDialog({
      type: "confirm",
      title: "THU HỒI QUYỀN THIẾT BỊ",
      message: `Bạn có chắc chắn muốn thu hồi quyền Admin của thiết bị [${targetDeviceId}]?\n\nThiết bị này sẽ bị giáng cấp xuống chỉ còn quyền XEM.`,
      onConfirm: async () => {
        try {
          const ref = doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            `${ROOM_ID}_config`,
            "approvals"
          );
          const updated = approvedDevicesList.filter(
            (id) => id !== targetDeviceId
          );
          await setDoc(ref, { approvedDevices: updated }, { merge: true });
        } catch (e) {
          setDialog({ type: "alert", title: "LỖI", message: e.message });
        }
      },
    });
  };

  const checkAuthSafety = () => {
    if (!user || status !== "connected") {
      setDialog({
        type: "alert",
        title: "LỖI BẢO MẬT FIREBASE",
        message: "Ứng dụng chưa kết nối thành công với máy chủ.",
      });
      return false;
    }
    if (!isEditor) {
      triggerActivateEditor();
      return false;
    }
    return true;
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Lỗi xác thực Firebase:", err);
        if (err.code === "auth/api-key-not-valid") setStatus("error_api");
        else if (err.code === "auth/operation-not-allowed")
          setStatus("error_auth");
        else setStatus("error");
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setStatus("connected");
      }
    });
    return () => unsub();
  }, []);

  const ensureDefaultLeagues = async () => {
    if (!user || status !== "connected") return;
    try {
      const batch = writeBatch(db);
      for (const item of DEFAULT_LEAGUES) {
        const ref = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `${ROOM_ID}_leagues`,
          item.id
        );
        batch.set(
          ref,
          {
            name: item.name,
            type: item.type,
            createdAt: item.createdAt,
            isArchived: false,
          },
          { merge: true }
        );
      }
      await batch.commit();
    } catch (error) {
      console.error("Lỗi tạo giải mặc định:", error);
    }
  };

  useEffect(() => {
    if (!user || status !== "connected") return;

    hasCheckedEmptyRef.current = false;

    const unsubApprovals = onSnapshot(
      doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `${ROOM_ID}_config`,
        "approvals"
      ),
      (snap) => {
        if (snap.exists()) {
          const approvedArr = snap.data().approvedDevices || [];
          setApprovedDevicesList(approvedArr);

          if (approvedArr.includes(deviceId)) {
            setIsEditor(true);
            localStorage.setItem("pes_editor_active", "true");
          } else {
            setIsEditor(false);
            setIsMasterAdmin(false);
            localStorage.removeItem("pes_editor_active");
            localStorage.removeItem("pes_master_admin");
          }
        } else {
          setApprovedDevicesList([]);
        }
      }
    );

    const unsubPlayers = onSnapshot(
      collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `${ROOM_ID}_players`
      ),
      (snap) => {
        setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    const unsubMatches = onSnapshot(
      collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `${ROOM_ID}_matches`
      ),
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMatches(arr);
      }
    );
    const unsubLeagues = onSnapshot(
      collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `${ROOM_ID}_leagues`
      ),
      (snap) => {
        if (snap.empty && !hasCheckedEmptyRef.current) {
          ensureDefaultLeagues();
        } else {
          const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setLeagues(
            remote.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
          );
        }
        hasCheckedEmptyRef.current = true;
      }
    );
    return () => {
      unsubPlayers();
      unsubMatches();
      unsubLeagues();
      unsubApprovals();
    };
  }, [user, status, deviceId]);

  const leaderboard = useMemo(() => {
    if (activeTab === "ALL") return [];
    return buildTableData(players, matches, leagues, activeTab);
  }, [players, matches, leagues, activeTab]);

  const allTimeStats = useMemo(
    () => getAllTimeStats(players, matches),
    [players, matches]
  );

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!checkAuthSafety()) return;

    const name = e.target.pname.value.trim();
    const team = e.target.pteam.value.trim();

    if (!name || !team) {
      setDialog({
        type: "alert",
        title: "LỖI",
        message: "Bạn phải nhập đủ tên người chơi và đội bóng.",
      });
      return;
    }
    if (activeTab === "ALL") {
      setDialog({
        type: "alert",
        title: "LỖI",
        message: "Bạn hãy chọn 1 bảng đấu cụ thể trước khi thêm người chơi.",
      });
      return;
    }

    const duplicatedPlayer = players.find(
      (p) =>
        !p.isArchived &&
        p.league === activeTab &&
        normalizeText(p.name) === normalizeText(name)
    );
    if (duplicatedPlayer) {
      setDialog({
        type: "alert",
        title: "LỖI",
        message: "Tên người chơi này đã tồn tại trong bảng hiện tại.",
      });
      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `${ROOM_ID}_players`
        ),
        {
          name,
          team,
          league: activeTab,
          avatar: "",
          createdAt: Date.now(),
          isArchived: false,
        }
      );
      setShowAddPlayer(false);
      e.target.reset();
    } catch (error) {
      setDialog({
        type: "alert",
        title: "LỖI LƯU DỮ LIỆU",
        message: error.message,
      });
    }
  };

  const handleUpdatePlayerInfo = async (playerName, newTeam, newAvatar) => {
    if (!checkAuthSafety()) return;
    try {
      const batch = writeBatch(db);
      const matchingPlayers = players.filter((p) => p.name === playerName);

      matchingPlayers.forEach((p) => {
        const playerRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `${ROOM_ID}_players`,
          p.id
        );
        const updates = {};
        if (newTeam !== undefined && newTeam !== null) updates.team = newTeam;
        if (newAvatar !== undefined && newAvatar !== null)
          updates.avatar = newAvatar;
        batch.update(playerRef, updates);
      });

      await batch.commit();

      setSelectedPlayer((prev) => ({
        ...prev,
        team: newTeam !== undefined && newTeam !== null ? newTeam : prev.team,
        avatar:
          newAvatar !== undefined && newAvatar !== null
            ? newAvatar
            : prev.avatar,
      }));
    } catch (error) {
      setDialog({
        type: "alert",
        title: "LỖI LƯU THÔNG TIN",
        message: error.message,
      });
    }
  };

  const handleAvatarUpload = (e) => {
    if (!checkAuthSafety()) return;
    const file = e.target.files?.[0];
    if (!file || !selectedPlayer || !isEditor) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 150;
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          startX,
          startY,
          size,
          size,
          0,
          0,
          MAX_SIZE,
          MAX_SIZE
        );

        const base64Avatar = canvas.toDataURL("image/jpeg", 0.8);
        handleUpdatePlayerInfo(selectedPlayer.name, undefined, base64Avatar);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    if (!checkAuthSafety()) return;
    const name = e.target.lname.value.trim();
    const type = e.target.ltype.value;
    if (!name) {
      setDialog({
        type: "alert",
        title: "LỖI",
        message: "Bạn hãy nhập tên giải.",
      });
      return;
    }
    try {
      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `${ROOM_ID}_leagues`
        ),
        {
          name: name.toUpperCase(),
          type,
          createdAt: Date.now(),
          isArchived: false,
        }
      );
      setShowCreateLeague(false);
      e.target.reset();
    } catch (err) {
      setDialog({ type: "alert", title: "LỖI TẠO GIẢI", message: err.message });
    }
  };

  const triggerRenameLeague = (leagueId, oldName) => {
    if (!checkAuthSafety()) return;
    setDialog({
      type: "prompt",
      title: "ĐỔI TÊN GIẢI ĐẤU",
      message: "Nhập tên mới cho giải đấu của bạn:",
      defaultValue: oldName,
      onConfirm: async (newName) => {
        if (
          newName &&
          newName.trim() &&
          newName.trim().toUpperCase() !== oldName.toUpperCase()
        ) {
          try {
            await updateDoc(
              doc(
                db,
                "artifacts",
                appId,
                "public",
                "data",
                `${ROOM_ID}_leagues`,
                leagueId
              ),
              {
                name: newName.trim().toUpperCase(),
              }
            );
          } catch (err) {
            setDialog({ type: "alert", title: "LỖI", message: err.message });
          }
        }
      },
    });
  };

  const handleMoveLeague = async (index, direction) => {
    if (!checkAuthSafety()) return;
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= liveLeagues.length) return;

    const currentLeague = liveLeagues[index];
    const swapLeague = liveLeagues[targetIndex];

    try {
      const batch = writeBatch(db);
      batch.update(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `${ROOM_ID}_leagues`,
          currentLeague.id
        ),
        { createdAt: swapLeague.createdAt }
      );
      batch.update(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `${ROOM_ID}_leagues`,
          swapLeague.id
        ),
        { createdAt: currentLeague.createdAt }
      );
      await batch.commit();
    } catch (err) {
      setDialog({
        type: "alert",
        title: "LỖI DI CHUYỂN",
        message: err.message,
      });
    }
  };

  const triggerDeleteLeague = (leagueId) => {
    if (!checkAuthSafety()) return;
    setDialog({
      type: "confirm",
      title: "CẢNH BÁO NGUY HIỂM",
      message:
        "Xóa Bảng này sẽ XÓA VĨNH VIỄN toàn bộ Người chơi và Trận đấu nằm bên trong nó.\nBạn có thực sự muốn xóa?",
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          batch.delete(
            doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              `${ROOM_ID}_leagues`,
              leagueId
            )
          );
          players
            .filter((p) => p.league === leagueId)
            .forEach((p) => {
              batch.delete(
                doc(
                  db,
                  "artifacts",
                  appId,
                  "public",
                  "data",
                  `${ROOM_ID}_players`,
                  p.id
                )
              );
            });
          matches
            .filter((m) => m.league === leagueId)
            .forEach((m) => {
              batch.delete(
                doc(
                  db,
                  "artifacts",
                  appId,
                  "public",
                  "data",
                  `${ROOM_ID}_matches`,
                  m.id
                )
              );
            });

          await batch.commit();
          setActiveTab("ALL");
        } catch (err) {
          setDialog({
            type: "alert",
            title: "LỖI XÓA BẢNG",
            message: err.message,
          });
        }
      },
    });
  };

  const triggerResetSeason = () => {
    if (!checkAuthSafety()) return;
    setDialog({
      type: "confirm",
      title: "LÀM MÙA GIẢI MỚI",
      message:
        "Hệ thống sẽ cất toàn bộ dữ liệu hiện tại vào Lịch sử và reset bảng xếp hạng (các giải tùy chỉnh sẽ bị xóa).\n\nBạn có chắc chắn muốn tạo mùa mới?",
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          players
            .filter((p) => !p.isArchived)
            .forEach((p) => {
              batch.update(
                doc(
                  db,
                  "artifacts",
                  appId,
                  "public",
                  "data",
                  `${ROOM_ID}_players`,
                  p.id
                ),
                { isArchived: true }
              );
            });
          matches
            .filter((m) => !m.isArchived)
            .forEach((m) => {
              batch.update(
                doc(
                  db,
                  "artifacts",
                  appId,
                  "public",
                  "data",
                  `${ROOM_ID}_matches`,
                  m.id
                ),
                { isArchived: true }
              );
            });
          liveLeagues
            .filter((l) => !DEFAULT_LEAGUES.some((d) => d.id === l.id))
            .forEach((l) => {
              batch.delete(
                doc(
                  db,
                  "artifacts",
                  appId,
                  "public",
                  "data",
                  `${ROOM_ID}_leagues`,
                  l.id
                )
              );
            });
          await batch.commit();
          setActiveTab("ALL");
        } catch (err) {
          setDialog({
            type: "alert",
            title: "LỖI TẠO MÙA MỚI",
            message: err.message,
          });
        }
      },
    });
  };

  const triggerDeletePlayer = (playerId) => {
    if (!checkAuthSafety()) return;
    setDialog({
      type: "confirm",
      title: "XÓA NGƯỜI CHƠI",
      message: "Bạn có chắc chắn muốn xóa người chơi này khỏi bảng?",
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              `${ROOM_ID}_players`,
              playerId
            )
          );
        } catch (err) {
          setDialog({ type: "alert", title: "LỖI XÓA", message: err.message });
        }
      },
    });
  };

  const triggerDeleteMatch = (matchId) => {
    if (!checkAuthSafety()) return;
    setDialog({
      type: "confirm",
      title: "XÓA TRẬN ĐẤU",
      message: "Bạn có chắc chắn muốn hủy kết quả trận đấu này?",
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              `${ROOM_ID}_matches`,
              matchId
            )
          );
        } catch (err) {
          setDialog({ type: "alert", title: "LỖI XÓA", message: err.message });
        }
      },
    });
  };

  const handleSaveMatch = async (e) => {
    e.preventDefault();
    if (!checkAuthSafety()) return;

    const homeId = e.target.home.value;
    const awayId = e.target.away.value;
    const gh = parseInt(e.target.gh.value, 10);
    const ga = parseInt(e.target.ga.value, 10);

    const matchLeague = showMatchModal?.matchLeague || activeTab;
    const isC1 = getLeagueType(leagues, matchLeague) === "C1";

    const winType = isC1 ? e.target.winType.value : "90M";
    const ph = isC1 ? parseInt(e.target.ph.value || 0, 10) : 0;
    const pa = isC1 ? parseInt(e.target.pa.value || 0, 10) : 0;

    const error = validateMatchInput({
      isC1,
      gh,
      ga,
      winType,
      ph,
      pa,
      homeId,
      awayId,
    });
    if (error) {
      setDialog({ type: "alert", title: "LỖI NHẬP TỶ SỐ", message: error });
      return;
    }

    const payload = {
      homeId,
      awayId,
      gh,
      ga,
      winType,
      ph,
      pa,
      league: matchLeague,
      createdAt: showMatchModal?.match?.createdAt || Date.now(),
      isArchived: false,
    };

    try {
      if (showMatchModal?.match?.id) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            `${ROOM_ID}_matches`,
            showMatchModal.match.id
          ),
          payload
        );
      } else {
        await addDoc(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            `${ROOM_ID}_matches`
          ),
          payload
        );
      }
      setShowMatchModal(null);
    } catch (err) {
      setDialog({
        type: "alert",
        title: "LỖI LƯU KẾT QUẢ",
        message: err.message,
      });
    }
  };

  const leagueMatches = useMemo(() => {
    if (activeTab === "ALL") return [];
    return matches.filter(
      (m) =>
        m.league === activeTab &&
        !m.isArchived &&
        typeof m.gh === "number" &&
        typeof m.ga === "number"
    );
  }, [matches, activeTab]);

  const profileFixtures = useMemo(() => {
    if (
      !selectedPlayer ||
      !selectedPlayer.league ||
      selectedPlayer.league === "ALL"
    )
      return [];

    const spLeaguePlayers = players.filter(
      (p) => p.league === selectedPlayer.league && !p.isArchived
    );
    const spOpponents = spLeaguePlayers.filter(
      (p) => p.id !== selectedPlayer.id
    );
    const spMatches = matches.filter(
      (m) =>
        !m.isArchived &&
        m.league === selectedPlayer.league &&
        typeof m.gh === "number" &&
        typeof m.ga === "number" &&
        (m.homeId === selectedPlayer.id || m.awayId === selectedPlayer.id)
    );

    const fixtures = [];
    spOpponents.forEach((opp) => {
      const oppMatches = spMatches
        .filter((m) => m.homeId === opp.id || m.awayId === opp.id)
        .sort((a, b) => a.createdAt - b.createdAt);

      oppMatches.forEach((m, idx) => {
        fixtures.push({ isPlayed: true, opp, leg: idx + 1, match: m });
      });

      for (let leg = oppMatches.length + 1; leg <= numLegs; leg++) {
        fixtures.push({
          isPlayed: false,
          opp,
          leg,
          match: null,
          homeId: leg % 2 !== 0 ? selectedPlayer.id : opp.id,
          awayId: leg % 2 !== 0 ? opp.id : selectedPlayer.id,
        });
      }
    });

    return fixtures.sort((a, b) => {
      if (a.isPlayed === b.isPlayed)
        return a.isPlayed
          ? b.match.createdAt - a.match.createdAt
          : a.leg - b.leg;
      return a.isPlayed ? 1 : -1;
    });
  }, [selectedPlayer, players, matches, numLegs]);

  const renderErrorBanner = () => {
    if (status === "connected" || status === "connecting") return null;
    let Icon = WifiOff;
    let title = "LỖI KẾT NỐI FIREBASE";
    let message = "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối.";
    if (status === "error_api") {
      Icon = KeyRound;
      title = "LỖI API KEY CỦA FIREBASE";
      message = "Mã API Key bị khóa/không đúng.";
    } else if (status === "error_auth") {
      Icon = UserX;
      title = "CHƯA BẬT ĐĂNG NHẬP ẨN DANH";
      message =
        "Bạn phải vào Firebase -> Authentication bật chế độ 'Anonymous'.";
    }
    return (
      <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 p-4 sm:p-5 rounded-2xl flex items-center gap-4 sm:gap-5 shadow-sm mx-4 sm:mx-0">
        <Icon size={32} className="shrink-0 text-rose-500" />
        <div>
          <div className="font-bold text-sm sm:text-lg uppercase text-rose-700">
            {title}
          </div>
          <div className="text-xs sm:text-sm mt-1">{message}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex font-sans">
      {/* DIALOG TOÀN CỤC */}
      {dialog && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 w-full max-w-sm shadow-2xl">
            <div className="mb-4 sm:mb-6">
              <h3
                className={`font-black text-lg sm:text-xl tracking-widest uppercase ${
                  dialog.type === "alert" ? "text-rose-500" : "text-blue-600"
                }`}
              >
                {dialog.title}
              </h3>
            </div>
            <div className="text-slate-600 text-sm sm:text-base font-medium mb-6 sm:mb-8 whitespace-pre-wrap leading-relaxed">
              {dialog.message}
            </div>

            {dialog.type === "prompt" && (
              <input
                id="global-dialog-input"
                defaultValue={dialog.defaultValue}
                className="w-full bg-slate-50 border border-slate-300 p-3 sm:p-4 rounded-xl outline-none text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold mb-6 transition-all text-center tracking-widest text-lg sm:text-xl"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    dialog.onConfirm(e.target.value);
                    setDialog(null);
                  }
                }}
              />
            )}

            {dialog.type === "activation" && (
              <div className="mb-6">
                <div className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl text-center mb-4">
                  <div className="text-[10px] text-slate-500 uppercase font-black mb-1">
                    Mã thiết bị của bạn
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-amber-500 tracking-widest select-all">
                    {dialog.deviceId}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDialog(null);
                    handleAdminLogin();
                  }}
                  className="text-blue-500 hover:text-blue-700 text-[10px] sm:text-xs uppercase font-bold underline w-full text-center transition-colors"
                >
                  Tôi là Admin (Đăng nhập bằng PIN)
                </button>
              </div>
            )}

            <div className="flex gap-2 sm:gap-3">
              {dialog.type !== "alert" && dialog.type !== "activation" && (
                <button
                  onClick={() => setDialog(null)}
                  className="flex-1 p-3 sm:p-4 rounded-xl font-bold bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 transition-colors uppercase"
                >
                  Hủy
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.type === "prompt") {
                    dialog.onConfirm(
                      document.getElementById("global-dialog-input").value
                    );
                  } else if (dialog.type === "confirm") {
                    dialog.onConfirm();
                  }
                  setDialog(null);
                }}
                className={`flex-1 p-3 sm:p-4 rounded-xl font-bold text-white text-xs transition-colors uppercase shadow-md ${
                  dialog.type === "alert" || dialog.type === "activation"
                    ? "bg-slate-800 hover:bg-slate-900"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg shadow-blue-500/30"
                }`}
              >
                {dialog.type === "alert" || dialog.type === "activation"
                  ? "Đóng"
                  : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUẢN LÝ THIẾT BỊ (ADMIN) */}
      {showDeviceManager && isMasterAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg sm:text-xl text-slate-800 uppercase tracking-wide">
                Quản Lý Thiết Bị
              </h3>
              <button
                onClick={() => setShowDeviceManager(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 mb-4 font-medium">
              Danh sách các thiết bị đang có quyền chỉnh sửa:
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scroll pr-2">
              {approvedDevicesList.length === 0 ? (
                <div className="text-center text-slate-400 italic p-4 text-sm">
                  Chưa có thiết bị nào được cấp quyền
                </div>
              ) : (
                approvedDevicesList.map((devId) => (
                  <div
                    key={devId}
                    className="flex justify-between items-center bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200"
                  >
                    <div>
                      <div className="font-black text-base sm:text-lg text-emerald-600 tracking-widest">
                        {devId}
                      </div>
                      {devId === deviceId && (
                        <div className="text-[9px] sm:text-[10px] text-amber-500 uppercase font-bold mt-0.5 sm:mt-1">
                          Thiết bị hiện tại của bạn
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRevokeDevice(devId)}
                      className="bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white p-2 sm:p-2.5 rounded-lg transition-colors shadow-sm"
                      title="Thu hồi quyền"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR TỐI ƯU (LIGHT THEME) */}
      <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex flex-col h-screen shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="p-5 flex-1 overflow-y-auto custom-scroll">
          <div className="mb-8 flex items-center gap-3">
            <Trophy size={32} className="text-blue-600" />
            <div className="text-3xl font-black italic text-slate-800 leading-tight tracking-tight">
              PES
              <br />
              <span className="text-blue-600">MANAGER</span>
            </div>
          </div>

          {/* TRẠNG THÁI PHÂN QUYỀN */}
          <div className="mb-6">
            {isMasterAdmin ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest shadow-sm">
                <ShieldCheck size={18} /> MASTER ADMIN
              </div>
            ) : isEditor ? (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest shadow-sm">
                <Edit3 size={18} /> ĐÃ KÍCH HOẠT SỬA
              </div>
            ) : (
              <button
                onClick={triggerActivateEditor}
                className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 p-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors shadow-sm"
              >
                <Lock size={18} /> Kích Hoạt Quyền Sửa
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setActiveTab("ALL");
            }}
            className={`w-full p-3.5 rounded-xl font-bold text-left transition-all flex items-center gap-3 mb-6 ${
              activeTab === "ALL"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Activity size={20} /> Hội Trường Danh Vọng
          </button>

          <div className="text-xs text-slate-400 font-bold uppercase mb-3 px-2 tracking-wider">
            Danh sách giải đấu
          </div>

          <div className="space-y-1.5">
            {liveLeagues.map((l) => {
              const isActive = activeTab === l.id;
              return (
                <div key={l.id} className="relative group">
                  {editingLeague === l.id ? (
                    <form
                      onSubmit={(e) => handleRenameLeague(e, l.id)}
                      className="flex items-center gap-2 px-2"
                    >
                      <input
                        name="newname"
                        defaultValue={l.name}
                        autoFocus
                        className="flex-1 bg-white border-2 border-blue-400 rounded-lg px-3 py-2 text-sm font-bold outline-none text-slate-800 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="submit"
                        className="text-emerald-500 hover:text-emerald-600 bg-emerald-50 p-1.5 rounded-md"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLeague(null)}
                        className="text-rose-500 hover:text-rose-600 bg-rose-50 p-1.5 rounded-md"
                      >
                        <X size={18} />
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveTab(l.id);
                      }}
                      className={`w-full p-3.5 rounded-xl font-bold text-left transition-all flex items-center gap-3 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={
                          isActive ? "text-blue-200" : "text-slate-400"
                        }
                      >
                        {l.type === "C1" ? "🏆" : "⚽"}
                      </span>{" "}
                      <span className="truncate">{l.name}</span>
                    </button>
                  )}
                  {/* Nút sửa/xóa tab */}
                  {!DEFAULT_LEAGUES.some((dl) => dl.id === l.id) &&
                    isActive &&
                    !editingLeague &&
                    isEditor && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-blue-600 pl-2 py-1 rounded-r-xl">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLeague(l.id);
                          }}
                          className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerDeleteLeague(l.id);
                          }}
                          className="p-1.5 hover:bg-rose-500 rounded-lg text-white transition-colors mr-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 space-y-2.5 bg-slate-50">
          {isEditor && (
            <>
              <button
                onClick={() => setShowCreateLeague(true)}
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 shadow-sm p-3.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={16} className="text-blue-500" /> TẠO GIẢI TÙY CHỈNH
              </button>
              {isMasterAdmin && (
                <>
                  <button
                    onClick={() => setShowDeviceManager(true)}
                    className="w-full text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 shadow-sm p-3.5 rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 transition-all"
                  >
                    <Monitor size={16} /> QUẢN LÝ MÁY (
                    {approvedDevicesList.length})
                  </button>
                  <button
                    onClick={handleGrantDeviceAccess}
                    className="w-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 shadow-sm p-3.5 rounded-xl hover:bg-amber-100 flex items-center justify-center gap-2 transition-all"
                  >
                    <KeyRound size={16} /> CẤP QUYỀN MÁY
                  </button>
                </>
              )}
              <button
                onClick={triggerResetSeason}
                className="w-full text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 shadow-sm p-3.5 rounded-xl hover:bg-rose-100 flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw size={16} /> LÀM MÙA GIẢI MỚI
              </button>
            </>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto custom-scroll relative">
        {renderErrorBanner()}

        {/* Thanh Tab Ngang (Mobile Only) */}
        <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 custom-scroll border-b border-slate-200 items-center sticky top-0 bg-slate-50 z-20 pt-2">
          {!isEditor ? (
            <button
              onClick={triggerActivateEditor}
              className="shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-700 p-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors mr-2 shadow-sm"
            >
              <Lock size={14} /> Nhập Mã Active
            </button>
          ) : isMasterAdmin ? (
            <button
              onClick={() => setShowDeviceManager(true)}
              className="shrink-0 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors mr-2 shadow-sm"
            >
              <Monitor size={14} /> Quản Lý Máy ({approvedDevicesList.length})
            </button>
          ) : (
            <div className="shrink-0 bg-blue-100 text-blue-700 p-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest mr-2 shadow-sm">
              <Edit3 size={14} /> Quyền Ghi
            </div>
          )}
          <button
            onClick={() => {
              setActiveTab("ALL");
            }}
            className={`shrink-0 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center gap-1.5 shadow-sm ${
              activeTab === "ALL"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            <Activity size={14} /> Hội Trường
          </button>
          {liveLeagues.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setActiveTab(l.id);
              }}
              className={`shrink-0 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center gap-1.5 shadow-sm ${
                activeTab === l.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              <span>{l.type === "C1" ? "🔥" : "⚽"}</span> {l.name}
            </button>
          ))}
        </div>

        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-6 sm:mb-8 gap-4">
          <div className="w-full xl:w-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 uppercase tracking-tight">
              {activeTab === "ALL"
                ? "HỘI TRƯỜNG DANH VỌNG"
                : currentLeague?.name}
            </h2>

            {/* THANH CÔNG CỤ QUẢN LÝ TAB */}
            {activeTab !== "ALL" && currentLeague && isEditor && (
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-3 sm:mt-4 bg-white w-fit p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() =>
                    handleMoveLeague(
                      liveLeagues.findIndex((l) => l.id === activeTab),
                      "UP"
                    )
                  }
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Chuyển Tab lên trước"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={() =>
                    handleMoveLeague(
                      liveLeagues.findIndex((l) => l.id === activeTab),
                      "DOWN"
                    )
                  }
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Chuyển Tab ra sau"
                >
                  <ChevronDown size={18} />
                </button>
                <div className="w-[1px] h-5 bg-slate-200 mx-1 sm:mx-2 hidden sm:block"></div>
                <button
                  onClick={() =>
                    triggerRenameLeague(currentLeague.id, currentLeague.name)
                  }
                  className="p-1.5 sm:p-2 flex items-center gap-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Đổi tên giải"
                >
                  <Edit2 size={16} />
                  <span className="text-[10px] sm:text-xs font-bold uppercase pr-1">
                    Đổi tên
                  </span>
                </button>
                {isMasterAdmin && (
                  <button
                    onClick={() => triggerDeleteLeague(currentLeague.id)}
                    className="p-1.5 sm:p-2 flex items-center gap-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Xóa giải"
                  >
                    <Trash2 size={16} />
                    <span className="text-[10px] sm:text-xs font-bold uppercase pr-1">
                      Xóa Tab
                    </span>
                  </button>
                )}
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-500 mt-3 font-medium">
              {activeTab === "ALL"
                ? "Bảng vàng ghi danh thành tích trọn đời của tất cả các huấn luyện viên"
                : currentLeague?.type === "C1"
                ? "🏆 Thể thức Cúp Loại Trực Tiếp (Không có kết quả Hòa)"
                : "⚽ Thể thức Vòng Tròn League (Thắng 3 - Hòa 1 - Thua 0)"}
            </p>
          </div>

          {activeTab !== "ALL" && isEditor && (
            <div className="flex w-full xl:w-auto mt-2 xl:mt-0">
              <button
                onClick={() => setShowAddPlayer(true)}
                className="w-full xl:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Plus size={18} /> THÊM HLV
              </button>
            </div>
          )}
        </header>

        {activeTab === "ALL" ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto w-full">
            <table className="w-full text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="p-3 sm:p-5 text-center">Hạng</th>
                  <th className="p-3 sm:p-5 text-left">Huấn Luyện Viên</th>
                  <th className="p-3 sm:p-5 text-center">Trận</th>
                  <th className="p-3 sm:p-5 text-center text-emerald-600">
                    Thắng
                  </th>
                  <th className="p-3 sm:p-5 text-center text-amber-500">Hòa</th>
                  <th className="p-3 sm:p-5 text-center text-rose-500">Thua</th>
                  <th className="p-3 sm:p-5 text-center text-blue-600">
                    Win Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allTimeStats.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-12 sm:p-20 text-center text-slate-400 font-medium italic"
                    >
                      Bảng vàng đang chờ được khắc tên...
                    </td>
                  </tr>
                ) : (
                  allTimeStats.map((s, i) => (
                    <tr
                      key={s.name}
                      onClick={() => {
                        setSelectedPlayer(s);
                        setProfileTab("HISTORY");
                      }}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="p-3 sm:p-5 text-center font-black text-lg sm:text-xl text-slate-400 group-hover:text-blue-500">
                        #{i + 1}
                      </td>
                      <td className="p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
                        <img
                          src={
                            s.avatar ||
                            `https://ui-avatars.com/api/?name=${s.name}&background=random&color=3b8ed0`
                          }
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 border-slate-200 object-cover bg-white shadow-sm"
                          alt="avatar"
                        />
                        <span className="font-bold sm:font-black text-sm sm:text-lg text-slate-800 whitespace-nowrap">
                          {s.name}
                        </span>
                      </td>
                      <td className="p-3 sm:p-5 text-center font-bold text-slate-600">
                        {s.P}
                      </td>
                      <td className="p-3 sm:p-5 text-center font-black text-emerald-600">
                        {s.W}
                      </td>
                      <td className="p-3 sm:p-5 text-center font-black text-amber-500">
                        {s.D}
                      </td>
                      <td className="p-3 sm:p-5 text-center font-black text-rose-500">
                        {s.L}
                      </td>
                      <td className="p-3 sm:p-5 text-center">
                        <div className="bg-blue-50 inline-block px-2 sm:px-3 py-1 rounded-lg font-black text-blue-600 text-xs sm:text-sm shadow-sm border border-blue-100">
                          {((s.W / s.P) * 100 || 0).toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-6 sm:gap-8">
            {/* CỘT TRÁI: BẢNG XẾP HẠNG */}
            <div className="w-full xl:w-2/3 space-y-4 sm:space-y-6">
              {/* Tùy chỉnh vòng đấu */}
              <div className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 px-2">
                  <Swords size={18} className="text-slate-400" />
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Cấu hình
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => isEditor && setNumLegs(1)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                      numLegs === 1
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    1 Lượt
                  </button>
                  <button
                    onClick={() => isEditor && setNumLegs(2)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                      numLegs === 2
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    2 Lượt
                  </button>
                </div>
              </div>

              {/* BẢNG XẾP HẠNG CHÍNH */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm w-full">
                <div className="overflow-x-auto custom-scroll w-full">
                  <table className="w-full text-[10px] sm:text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[8px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <tr>
                        <th className="px-1 py-2 sm:p-4 text-center w-6 sm:w-16">
                          #
                        </th>
                        <th className="px-1 py-2 sm:p-4 text-left">
                          HLV / Đội Bóng
                        </th>
                        <th className="px-1 py-2 sm:p-4 text-center w-6 sm:w-16">
                          Trận
                        </th>
                        <th className="px-1 py-2 sm:p-4 text-center whitespace-nowrap">
                          W-D-L
                        </th>
                        <th
                          className="px-1 py-2 sm:p-4 text-center w-6 sm:w-16"
                          title="Bàn Thắng"
                        >
                          BT
                        </th>
                        <th
                          className="px-1 py-2 sm:p-4 text-center w-6 sm:w-16"
                          title="Bàn Thua"
                        >
                          BB
                        </th>
                        <th
                          className="px-1 py-2 sm:p-4 text-center w-6 sm:w-16"
                          title="Hiệu Số"
                        >
                          HS
                        </th>
                        <th className="px-1 py-2 sm:p-4 text-center text-blue-600 w-8 sm:w-20">
                          PTS
                        </th>
                        {isEditor && (
                          <th className="px-1 py-2 sm:p-4 text-center w-8 sm:w-16">
                            Xóa
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaderboard.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isEditor ? "9" : "8"}
                            className="p-12 text-center text-slate-400 font-medium italic text-xs sm:text-sm"
                          >
                            Chưa có thông tin bảng xếp hạng
                          </td>
                        </tr>
                      ) : (
                        leaderboard.map((row, i) => {
                          const isTop2 = i < 2;
                          const isBottom3 =
                            currentLeague?.type !== "C1" &&
                            i >= leaderboard.length - 3 &&
                            leaderboard.length >= 4;
                          return (
                            <tr
                              key={row.id}
                              onClick={() => {
                                setSelectedPlayer(row);
                                setProfileTab("FIXTURES");
                              }}
                              className="hover:bg-slate-50 cursor-pointer transition-colors group"
                            >
                              <td className="px-1 py-2 sm:p-4">
                                <div
                                  className={`w-5 h-5 sm:w-8 sm:h-8 mx-auto flex items-center justify-center rounded-full font-black text-[9px] sm:text-sm ${
                                    isTop2
                                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                      : isBottom3
                                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {i + 1}
                                </div>
                              </td>
                              <td className="px-1 py-2 sm:p-4 min-w-[90px] sm:min-w-0 overflow-hidden">
                                <div className="flex items-center gap-1.5 sm:gap-3">
                                  <img
                                    src={
                                      row.avatar ||
                                      `https://ui-avatars.com/api/?name=${row.name}&background=random&color=fff`
                                    }
                                    className="w-6 h-6 sm:w-10 sm:h-10 rounded-full border border-slate-200 bg-white object-cover shadow-sm shrink-0"
                                    alt=""
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold sm:font-black text-[11px] sm:text-base text-slate-800 truncate">
                                      {row.name}
                                    </div>
                                    <div className="text-[7px] sm:text-[10px] text-blue-600 uppercase font-bold truncate">
                                      {row.team}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-1 py-2 sm:p-4 text-center font-bold text-slate-600">
                                {row.P}
                              </td>
                              <td className="px-1 py-2 sm:p-4 text-center font-bold sm:tracking-wider text-slate-500 whitespace-nowrap">
                                {row.W}-{row.D || 0}-{row.L}
                              </td>
                              <td className="px-1 py-2 sm:p-4 text-center font-bold text-emerald-600">
                                {row.GF}
                              </td>
                              <td className="px-1 py-2 sm:p-4 text-center font-bold text-rose-500">
                                {row.GA}
                              </td>
                              <td className="px-1 py-2 sm:p-4 text-center font-bold text-cyan-600">
                                {row.GF - row.GA}
                              </td>
                              <td className="px-1 py-2 sm:p-4 text-center font-black text-xs sm:text-xl text-blue-600 bg-blue-50/50">
                                {row.Pts}
                              </td>
                              {isEditor && (
                                <td className="px-1 py-2 sm:p-4 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerDeletePlayer(row.id);
                                    }}
                                    className="p-1 sm:p-2 rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2
                                      size={12}
                                      className="sm:w-4 sm:h-4"
                                    />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: TRẬN GẦN ĐÂY */}
            <div className="w-full xl:w-1/3">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-4 shadow-sm">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-slate-600">
                    <History size={16} /> TRẬN MỚI ĐẤU
                  </div>
                  {isEditor && (
                    <button
                      onClick={() =>
                        setShowMatchModal({
                          match: null,
                          homeId: "",
                          awayId: "",
                          manual: true,
                          matchLeague: activeTab,
                        })
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg shadow-sm transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100 max-h-[50vh] sm:max-h-[70vh] overflow-y-auto custom-scroll">
                  {leagueMatches.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-medium text-xs sm:text-sm italic">
                      Chưa có kết quả nào được ghi nhận
                    </div>
                  ) : (
                    leagueMatches.map((m) => {
                      const h = players.find((p) => p.id === m.homeId);
                      const a = players.find((p) => p.id === m.awayId);
                      if (!h || !a) return null;
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (isEditor)
                              setShowMatchModal({
                                match: m,
                                homeId: m.homeId,
                                awayId: m.awayId,
                                manual: true,
                                matchLeague: m.league,
                              });
                          }}
                          className={`p-4 group transition-colors relative ${
                            isEditor ? "hover:bg-slate-50 cursor-pointer" : ""
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2 sm:gap-3">
                            <span
                              className="text-xs font-bold text-slate-700 w-1/3 text-right truncate"
                              title={h.name}
                            >
                              {h.name}
                            </span>
                            <div className="bg-slate-100 border border-slate-200 px-2 sm:px-3 py-1 rounded-lg text-sm sm:text-lg font-black text-slate-800 tracking-widest shadow-inner">
                              {m.gh}-{m.ga}
                            </div>
                            <span
                              className="text-xs font-bold text-slate-700 w-1/3 truncate"
                              title={a.name}
                            >
                              {a.name}
                            </span>
                          </div>
                          {currentLeague?.type === "C1" &&
                            m.winType !== "90M" && (
                              <div className="text-center text-[9px] text-amber-600 font-bold uppercase mt-2 bg-amber-50 py-1 rounded-lg border border-amber-100 w-fit mx-auto px-3">
                                {m.winType === "ET"
                                  ? "Hiệp phụ"
                                  : `PEN: ${m.ph}-${m.pa}`}
                              </div>
                            )}

                          {/* Nút xóa trận nhỏ */}
                          {isEditor && (
                            <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerDeleteMatch(m.id);
                                }}
                                className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-rose-50 transition-colors shadow-sm"
                              >
                                <Trash2 size={12} className="text-rose-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* HỒ SƠ NGƯỜI CHƠI */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4 md:p-8 transition-opacity">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 w-full max-w-4xl max-h-[95vh] sm:max-h-full flex flex-col shadow-2xl overflow-hidden relative">
            {/* HEADER HỒ SƠ */}
            <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-200 flex justify-between items-start relative shrink-0">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="absolute right-4 sm:right-6 top-4 sm:top-6 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 p-2 rounded-full transition-all hover:bg-slate-100 shadow-sm z-10"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>

              <div className="flex flex-row items-center gap-4 sm:gap-6 w-full">
                {/* Khu vực Avatar */}
                <div className="relative group cursor-pointer shrink-0">
                  <img
                    src={
                      selectedPlayer.avatar ||
                      `https://ui-avatars.com/api/?name=${selectedPlayer.name}&background=random&color=fff&size=150`
                    }
                    className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl sm:rounded-[2rem] border-[3px] sm:border-4 border-blue-500 object-cover bg-white shadow-md"
                    alt=""
                  />

                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleAvatarUpload}
                  />
                  {isEditor && (
                    <button
                      onClick={() => {
                        if (fileInputRef.current) fileInputRef.current.click();
                      }}
                      className="absolute -bottom-2 -right-2 bg-blue-600 p-1.5 sm:p-2 rounded-xl text-white opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-blue-700 border-2 border-white"
                    >
                      <ImageIcon size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>

                {/* Thông tin tên & đội */}
                <div className="pt-1 sm:pt-2 flex-1 min-w-0 pr-10 sm:pr-0">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight truncate">
                    {selectedPlayer.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-2">
                    {selectedPlayer.team && (
                      <>
                        <span className="bg-blue-100 text-blue-700 px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-sm truncate max-w-full">
                          {selectedPlayer.team}
                        </span>
                        {isEditor && (
                          <button
                            onClick={() => {
                              setDialog({
                                type: "prompt",
                                title: "SỬA TÊN ĐỘI BÓNG",
                                message:
                                  "Nhập tên đội bóng mới mà huấn luyện viên đang dẫn dắt:",
                                defaultValue: selectedPlayer.team,
                                onConfirm: (team) =>
                                  handleUpdatePlayerInfo(
                                    selectedPlayer.name,
                                    team.trim(),
                                    undefined
                                  ),
                              });
                            }}
                            className="text-slate-400 hover:text-blue-600 bg-white border border-slate-200 p-1 rounded shadow-sm"
                          >
                            <Edit2 size={12} className="sm:w-3.5 sm:h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BODY HỒ SƠ */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scroll flex-1 bg-white">
              {/* Hàng Thống kê tổng */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-slate-50 p-2 sm:p-4 rounded-xl sm:rounded-2xl text-center border border-slate-200 shadow-sm">
                  <div className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase mb-0.5 sm:mb-1">
                    Số Trận
                  </div>
                  <div className="text-lg sm:text-2xl md:text-3xl font-black text-slate-800">
                    {selectedPlayer.P || 0}
                  </div>
                </div>
                <div className="bg-emerald-50 p-2 sm:p-4 rounded-xl sm:rounded-2xl text-center border border-emerald-100 shadow-sm">
                  <div className="text-[8px] sm:text-[10px] text-emerald-600 font-bold uppercase mb-0.5 sm:mb-1">
                    Thắng
                  </div>
                  <div className="text-lg sm:text-2xl md:text-3xl font-black text-emerald-600">
                    {selectedPlayer.W || 0}
                  </div>
                </div>
                <div className="bg-rose-50 p-2 sm:p-4 rounded-xl sm:rounded-2xl text-center border border-rose-100 shadow-sm">
                  <div className="text-[8px] sm:text-[10px] text-rose-600 font-bold uppercase mb-0.5 sm:mb-1">
                    Thua
                  </div>
                  <div className="text-lg sm:text-2xl md:text-3xl font-black text-rose-600">
                    {selectedPlayer.L || 0}
                  </div>
                </div>
                <div className="bg-blue-50 p-2 sm:p-4 rounded-xl sm:rounded-2xl text-center border border-blue-100 shadow-sm">
                  <div className="text-[8px] sm:text-[10px] text-blue-600 font-bold uppercase mb-0.5 sm:mb-1">
                    Win Rate
                  </div>
                  <div className="text-lg sm:text-2xl md:text-3xl font-black text-blue-600">
                    {(
                      ((selectedPlayer.W || 0) / (selectedPlayer.P || 1)) *
                      100
                    ).toFixed(0)}
                    %
                  </div>
                </div>
              </div>

              {/* TABS TÍNH NĂNG TRONG HỒ SƠ */}
              <div className="flex border-b border-slate-200 mb-4 sm:mb-6 gap-4 sm:gap-8 px-1 sm:px-2 overflow-x-auto custom-scroll">
                {selectedPlayer.league && selectedPlayer.league !== "ALL" && (
                  <button
                    onClick={() => setProfileTab("FIXTURES")}
                    className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${
                      profileTab === "FIXTURES"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Swords size={16} className="sm:w-[18px] sm:h-[18px]" />{" "}
                    Lịch thi đấu
                  </button>
                )}
                <button
                  onClick={() => setProfileTab("HISTORY")}
                  className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${
                    profileTab === "HISTORY"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <History size={16} className="sm:w-[18px] sm:h-[18px]" />{" "}
                  Thống kê các mùa
                </button>
              </div>

              {/* NỘI DUNG TABS */}
              {profileTab === "FIXTURES" &&
                selectedPlayer.league &&
                selectedPlayer.league !== "ALL" && (
                  <div className="space-y-3">
                    {profileFixtures.length === 0 ? (
                      <div className="bg-slate-50 p-8 sm:p-10 text-center rounded-2xl border border-slate-200">
                        <div className="text-slate-600 font-bold mb-1">
                          Bảng này chỉ có 1 mình bạn.
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-400">
                          Hãy thêm đối thủ để tạo lịch thi đấu.
                        </div>
                      </div>
                    ) : (
                      profileFixtures.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border transition-all ${
                            item.isPlayed
                              ? "bg-slate-50 border-slate-200 opacity-80"
                              : "bg-white border-blue-200 shadow-md hover:border-blue-400"
                          }`}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                            <div
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs shrink-0 shadow-sm border ${
                                item.isPlayed
                                  ? "bg-slate-200 text-slate-500 border-slate-300"
                                  : "bg-blue-100 text-blue-600 border-blue-200"
                              }`}
                            >
                              L.{item.leg}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-widest mb-0.5 sm:mb-1 ${
                                  item.isPlayed
                                    ? "text-slate-400"
                                    : "text-blue-500"
                                }`}
                              >
                                {item.isPlayed ? "ĐÃ ĐÁ" : "CHƯA ĐÁ"} •{" "}
                                {item.homeId === selectedPlayer.id
                                  ? "SÂN NHÀ"
                                  : "SÂN KHÁCH"}
                              </div>
                              <div className="font-black text-sm sm:text-lg text-slate-800 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                vs{" "}
                                <span className="truncate">
                                  {item.opp.name}
                                </span>{" "}
                                <span className="bg-slate-100 border border-slate-200 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] text-slate-600 truncate max-w-[80px] sm:max-w-none">
                                  {item.opp.team}
                                </span>
                              </div>
                            </div>
                          </div>

                          {item.isPlayed ? (
                            <div className="bg-white border border-slate-200 px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl text-center flex items-center justify-center gap-3 sm:gap-4 shadow-sm w-full md:w-auto">
                              <div>
                                <div className="text-lg sm:text-xl font-black text-slate-800">
                                  {item.match.gh} - {item.match.ga}
                                </div>
                                {item.match.winType !== "90M" && (
                                  <div className="text-[9px] sm:text-[10px] text-amber-600 font-bold">
                                    {item.match.winType}
                                  </div>
                                )}
                              </div>
                              {isEditor && (
                                <button
                                  onClick={() =>
                                    triggerDeleteMatch(item.match.id)
                                  }
                                  className="p-1.5 sm:p-2 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ) : isEditor ? (
                            <button
                              onClick={() =>
                                setShowMatchModal({
                                  match: null,
                                  homeId: item.homeId,
                                  awayId: item.awayId,
                                  manual: false,
                                  matchLeague: selectedPlayer.league,
                                })
                              }
                              className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-md transition-all hover:-translate-y-0.5"
                            >
                              ⚽ Nhập Tỷ Số
                            </button>
                          ) : (
                            <div className="text-slate-400 bg-slate-50 border border-slate-100 rounded-xl font-bold text-[10px] sm:text-xs uppercase text-center w-full md:w-auto px-6 sm:px-8 py-2.5 sm:py-3">
                              ⏳ Chờ kết quả
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

              {profileTab === "HISTORY" && (
                <div className="space-y-2.5">
                  {matches
                    .filter((m) => {
                      const h = players.find((p) => p.id === m.homeId);
                      const a = players.find((p) => p.id === m.awayId);
                      return (
                        h &&
                        a &&
                        (h.name === selectedPlayer.name ||
                          a.name === selectedPlayer.name) &&
                        typeof m.gh === "number"
                      );
                    })
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 30)
                    .map((m) => {
                      const h = players.find((p) => p.id === m.homeId);
                      const a = players.find((p) => p.id === m.awayId);

                      let isWin = false;
                      let isLoss = false;
                      if (m.gh > m.ga) {
                        isWin = h.name === selectedPlayer.name;
                        isLoss = a.name === selectedPlayer.name;
                      } else if (m.gh < m.ga) {
                        isWin = a.name === selectedPlayer.name;
                        isLoss = h.name === selectedPlayer.name;
                      } else if (m.winType === "PEN") {
                        if (m.ph > m.pa) {
                          isWin = h.name === selectedPlayer.name;
                          isLoss = a.name === selectedPlayer.name;
                        } else if (m.pa > m.ph) {
                          isWin = a.name === selectedPlayer.name;
                          isLoss = h.name === selectedPlayer.name;
                        }
                      }

                      return (
                        <div
                          key={m.id}
                          className={`bg-white p-3 sm:p-4 rounded-xl flex items-center justify-between border-l-4 border-y border-r border-slate-200 shadow-sm ${
                            isWin
                              ? "border-l-emerald-500"
                              : isLoss
                              ? "border-l-rose-500"
                              : "border-l-slate-300"
                          }`}
                        >
                          <div className="flex flex-col gap-1 w-16 sm:w-24 shrink-0">
                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase">
                              {new Date(m.createdAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </span>
                            <span
                              className={`text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded self-start ${
                                isWin
                                  ? "bg-emerald-100 text-emerald-700"
                                  : isLoss
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isWin ? "THẮNG" : isLoss ? "THUA" : "HÒA"}
                            </span>
                          </div>
                          <div className="flex-1 text-center font-bold text-xs sm:text-sm text-slate-500 flex items-center justify-center gap-1 sm:gap-2 min-w-0">
                            <span
                              className={`truncate ${
                                h.name === selectedPlayer.name
                                  ? "text-slate-900"
                                  : ""
                              }`}
                            >
                              {h.name}
                            </span>
                            <span className="mx-1 sm:mx-2 text-slate-800 font-black bg-slate-100 border border-slate-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shrink-0">
                              {m.gh} - {m.ga}{" "}
                              {m.winType === "PEN" && (
                                <span className="text-[8px] sm:text-[10px]">
                                  ({m.ph}-{m.pa})
                                </span>
                              )}
                            </span>
                            <span
                              className={`truncate ${
                                a.name === selectedPlayer.name
                                  ? "text-slate-900"
                                  : ""
                              }`}
                            >
                              {a.name}
                            </span>
                          </div>
                          <div className="w-10 sm:w-16 shrink-0 text-right">
                            <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase truncate border border-slate-200 bg-slate-50 px-1 py-0.5 rounded">
                              {m.league}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM CẦU THỦ */}
      {showAddPlayer && isEditor && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h3 className="font-black text-lg sm:text-xl text-slate-800 uppercase tracking-wide">
                Thêm Huấn Luyện Viên
              </h3>
              <button
                onClick={() => setShowAddPlayer(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPlayer} className="space-y-5 sm:space-y-6">
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 ml-1 sm:ml-2 mb-1.5 sm:mb-2 block uppercase tracking-widest">
                  Tên hiển thị
                </label>
                <input
                  name="pname"
                  className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl sm:rounded-2xl outline-none text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="VD: Sói Ca"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 ml-1 sm:ml-2 mb-1.5 sm:mb-2 block uppercase tracking-widest">
                  Đội bóng sử dụng
                </label>
                <input
                  name="pteam"
                  className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl sm:rounded-2xl outline-none text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="VD: Bayern Munich"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 transition-all p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black uppercase text-white tracking-widest shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Xác Nhận Thêm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠO GIẢI */}
      {showCreateLeague && isEditor && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h3 className="font-black text-lg sm:text-xl text-slate-800 uppercase tracking-wide">
                Tạo Giải Tùy Chỉnh
              </h3>
            </div>
            <form
              onSubmit={handleCreateLeague}
              className="space-y-5 sm:space-y-6"
            >
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 ml-1 sm:ml-2 mb-1.5 sm:mb-2 block uppercase tracking-widest">
                  Tên Giải Đấu
                </label>
                <input
                  name="lname"
                  placeholder="VD: CUP GIAO HỮU"
                  className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl sm:rounded-2xl outline-none font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 ml-1 sm:ml-2 mb-1.5 sm:mb-2 block uppercase tracking-widest">
                  Thể Thức / Luật
                </label>
                <select
                  name="ltype"
                  className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl sm:rounded-2xl outline-none font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                  defaultValue="STD"
                >
                  <option value="STD">
                    Đấu Vòng Tròn League (Cho phép hòa)
                  </option>
                  <option value="C1">Đấu Cúp (Loại trực tiếp/Không hòa)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateLeague(false)}
                  className="flex-1 p-3 sm:p-4 rounded-xl sm:rounded-2xl font-bold bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 transition-colors"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  className="flex-1 p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black bg-blue-600 text-white text-xs hover:bg-blue-700 shadow-md"
                >
                  KHỞI TẠO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NHẬP TỶ SỐ */}
      {showMatchModal && isEditor && (
        <div className="fixed inset-0 bg-slate-900/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-blue-200 w-full max-w-md shadow-[0_10px_40px_rgba(59,142,208,0.2)]">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h3 className="font-black text-lg sm:text-xl text-blue-600 uppercase tracking-widest">
                {showMatchModal.match ? "CHỈNH SỬA KẾT QUẢ" : "CẬP NHẬT TỶ SỐ"}
              </h3>
              <button
                onClick={() => setShowMatchModal(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="space-y-5 sm:space-y-6">
              {showMatchModal.manual ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase mb-1 sm:mb-2 ml-1 sm:ml-2 tracking-widest">
                      Chủ nhà
                    </div>
                    <select
                      name="home"
                      defaultValue={
                        showMatchModal.homeId ||
                        showMatchModal.match?.homeId ||
                        ""
                      }
                      className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-3.5 rounded-xl outline-none text-xs sm:text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    >
                      <option value="">Chọn HLV...</option>
                      {players
                        .filter(
                          (p) =>
                            p.league ===
                            (showMatchModal.matchLeague || activeTab)
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase mb-1 sm:mb-2 mr-1 sm:mr-2 tracking-widest text-right">
                      Đội khách
                    </div>
                    <select
                      name="away"
                      defaultValue={
                        showMatchModal.awayId ||
                        showMatchModal.match?.awayId ||
                        ""
                      }
                      className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-3.5 rounded-xl outline-none text-xs sm:text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      dir="rtl"
                    >
                      <option value="">...Chọn HLV</option>
                      {players
                        .filter(
                          (p) =>
                            p.league ===
                            (showMatchModal.matchLeague || activeTab)
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="w-2/5">
                    <div className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase mb-0.5 sm:mb-1 tracking-widest">
                      Chủ nhà
                    </div>
                    <div className="font-black text-slate-800 text-sm sm:text-lg truncate">
                      {
                        players.find((p) => p.id === showMatchModal.homeId)
                          ?.name
                      }
                    </div>
                    <input
                      type="hidden"
                      name="home"
                      value={showMatchModal.homeId}
                    />
                  </div>
                  <div className="w-1/5 text-center text-[10px] sm:text-xs font-black text-slate-300 italic">
                    VS
                  </div>
                  <div className="w-2/5 text-right">
                    <div className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase mb-0.5 sm:mb-1 tracking-widest">
                      Đội khách
                    </div>
                    <div className="font-black text-slate-800 text-sm sm:text-lg truncate">
                      {
                        players.find((p) => p.id === showMatchModal.awayId)
                          ?.name
                      }
                    </div>
                    <input
                      type="hidden"
                      name="away"
                      value={showMatchModal.awayId}
                    />
                  </div>
                </div>
              )}

              {/* Ô nhập liệu to, rõ, tự bôi đen */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 py-2 sm:py-4">
                <input
                  onFocus={(e) => e.target.select()}
                  name="gh"
                  type="number"
                  min="0"
                  defaultValue={showMatchModal.match?.gh ?? 0}
                  className="w-20 sm:w-28 bg-white border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all p-3 sm:p-5 rounded-2xl sm:rounded-3xl text-center text-4xl sm:text-5xl font-black outline-none text-slate-800 shadow-sm"
                  autoFocus
                />
                <span className="text-xl sm:text-2xl text-slate-300 font-black">
                  -
                </span>
                <input
                  onFocus={(e) => e.target.select()}
                  name="ga"
                  type="number"
                  min="0"
                  defaultValue={showMatchModal.match?.ga ?? 0}
                  className="w-20 sm:w-28 bg-white border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all p-3 sm:p-5 rounded-2xl sm:rounded-3xl text-center text-4xl sm:text-5xl font-black outline-none text-slate-800 shadow-sm"
                />
              </div>

              {getLeagueType(
                leagues,
                showMatchModal.matchLeague || activeTab
              ) === "C1" && (
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Định đoạt tại
                    </span>
                    <select
                      name="winType"
                      defaultValue={showMatchModal.match?.winType || "90M"}
                      className="bg-white py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-bold outline-none border border-slate-200 text-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-sm"
                    >
                      <option value="90M">90 Phút Chính</option>
                      <option value="ET">Hiệp Phụ (ET)</option>
                      <option value="PEN">Penalty</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Tỷ số Pen
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        onFocus={(e) => e.target.select()}
                        name="ph"
                        type="number"
                        min="0"
                        defaultValue={showMatchModal.match?.ph ?? 0}
                        className="w-12 sm:w-14 bg-white p-2 sm:p-2.5 rounded-lg text-center text-xs sm:text-sm font-black border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-slate-800 outline-none shadow-sm transition-all"
                      />
                      <span className="text-slate-300 font-black">-</span>
                      <input
                        onFocus={(e) => e.target.select()}
                        name="pa"
                        type="number"
                        min="0"
                        defaultValue={showMatchModal.match?.pa ?? 0}
                        className="w-12 sm:w-14 bg-white p-2 sm:p-2.5 rounded-lg text-center text-xs sm:text-sm font-black border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-slate-800 outline-none shadow-sm transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all p-4 sm:p-5 rounded-2xl font-black uppercase tracking-widest shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                LƯU KẾT QUẢ
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        
        /* Đội hình chống CodeSandbox Button - Ẩn mọi dấu vết */
        #csb-dev-tools, 
        .csb-dev-tools, 
        .csb-edit-btn, 
        #csb-edit-btn,
        iframe[title="CodeSandbox devtools"],
        div[style*="z-index: 99999"] { 
            display: none !important; 
            width: 0 !important; 
            height: 0 !important; 
            opacity: 0 !important; 
            pointer-events: none !important; 
            visibility: hidden !important; 
        }
      `}</style>
    </div>
  );
}
