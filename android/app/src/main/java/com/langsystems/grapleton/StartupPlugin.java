package com.langsystems.grapleton;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Startup")
public class StartupPlugin extends Plugin {
    @PluginMethod
    public void ready(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            int background = Color.parseColor("#faf6f1");
            getActivity().getWindow().setBackgroundDrawable(new ColorDrawable(background));
            getBridge().getWebView().setBackgroundColor(background);
            EdgeToEdge.enable(getActivity());
            call.resolve();
        });
    }
}
