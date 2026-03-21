export default function GlobalDialog({ dialog, setDialog }) {
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
            className="w-full bg-slate-50 border border-slate-300 p-3 sm:p-4 rounded-xl outline-none text-slate-900 focus:border-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                dialog.onConfirm(e.target.value);
                setDialog(null);
              }
            }}
          />
        )}

        <button
          onClick={() => {
            if (dialog.onConfirm) dialog.onConfirm();
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
  );
}
