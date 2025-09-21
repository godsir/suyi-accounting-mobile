package com.suyi.accounting;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.graphics.Color;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        forceStatusBarLightContent();
    }
    
    @Override
    public void onResume() {
        super.onResume();
        forceStatusBarLightContent();
    }
    
    private void forceStatusBarLightContent() {
        Window window = getWindow();
        
        // 确保不是全屏模式
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        
        // 强制设置状态栏背景为白色
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.WHITE);
        }
        
        // 强制设置状态栏文字为深色（黑色）- Android 6.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decorView = window.getDecorView();
            int flags = decorView.getSystemUiVisibility();
            
            // 移除所有状态栏相关标志，然后添加浅色状态栏标志
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;  // 先清除
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;   // 再设置
            
            decorView.setSystemUiVisibility(flags);
        }
        
        // Android 11+ 的新方法（兼容性处理）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            window.getInsetsController().setSystemBarsAppearance(
                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            );
        }
        
        System.out.println("✅ 强制设置状态栏：白色背景 + 深色文字");
    }
}
