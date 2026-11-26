package com.langsystems.grapleton;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.os.SystemClock;
import android.os.Build;
import android.animation.ValueAnimator;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import androidx.core.splashscreen.SplashScreen;
import android.graphics.Color;

public class MainActivity extends BridgeActivity {
    private volatile boolean startupPainted = false;

    public void markStartupPainted() {
        startupPainted = true;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        long startupDeadline = SystemClock.elapsedRealtime() + 8000;
        splash.setKeepOnScreenCondition(() -> !startupPainted && SystemClock.elapsedRealtime() < startupDeadline);
        splash.setOnExitAnimationListener(provider -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ValueAnimator.areAnimatorsEnabled()) {
                provider.remove();
                return;
            }
            provider.getView().animate().alpha(0f).setDuration(120).withEndAction(provider::remove).start();
        });
        registerPlugin(StartupPlugin.class);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
    }
}
