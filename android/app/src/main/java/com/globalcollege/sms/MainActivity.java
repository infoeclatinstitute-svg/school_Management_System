package com.globalcollege.sms;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getPackageName() != null && getPackageName().contains("saasadmin")) {
            getBridge().getWebView().post(() -> {
                getBridge().getWebView().loadUrl("https://localhost/?target=saas-admin");
            });
        }
    }
}
