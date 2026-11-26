package com.langsystems.grapleton;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Startup")
public class StartupPlugin extends Plugin {
    @PluginMethod
    public void painted(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            ((MainActivity) getActivity()).markStartupPainted();
            call.resolve();
        });
    }

    @PluginMethod
    public void ready(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            // SystemBars also reads this Activity theme when repainting native inset padding.
            getActivity().getTheme().applyStyle(R.style.GrapletonReadySurface, true);
            int background = Color.parseColor("#faf6f1");
            getActivity().getWindow().setBackgroundDrawable(new ColorDrawable(background));
            getActivity().getWindow().getDecorView().setBackgroundColor(background);
            getBridge().getWebView().setBackgroundColor(background);
            EdgeToEdge.enable(getActivity(), SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
                SystemBarStyle.light(Color.TRANSPARENT, Color.parseColor("#351d28")));
            call.resolve();
        });
    }
}
