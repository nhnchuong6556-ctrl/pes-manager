export default function GlobalDialog({ dialog, setDialog, handleAdminLogin }) {
  if (!dialog) return null;

  return (
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
  );
}
