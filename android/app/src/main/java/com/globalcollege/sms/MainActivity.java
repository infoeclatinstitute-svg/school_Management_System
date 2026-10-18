package com.globalcollege.sms;

import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final boolean isSaasAdmin = getPackageName() != null && getPackageName().contains("saasadmin");
        if (isSaasAdmin) {
            getBridge().getWebView().post(() -> {
                getBridge().getWebView().loadUrl("https://cloud.eclat.institute/?target=saas-admin");
            });
        }

        // Seamless offline fallback: if live cloud cannot be reached, fallback to local bundled assets
        getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    String failingUrl = request.getUrl() != null ? request.getUrl().toString() : "";
                    if (failingUrl.startsWith("https://cloud.eclat.institute")) {
                        String fallbackUrl = isSaasAdmin ? "https://localhost/?target=saas-admin" : "https://localhost/";
                        view.post(() -> view.loadUrl(fallbackUrl));
                    }
                }
            }
        });
    }
}
