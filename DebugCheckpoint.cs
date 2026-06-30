using System;
using System.IO;
using System.Runtime.InteropServices;

class DebugCheckpoint
{
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern int sqlite3_open_v2(string filename, out IntPtr db, int flags, string vfs);
    
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern int sqlite3_exec(IntPtr db, string sql, IntPtr callback, IntPtr arg, out IntPtr errMsg);
    
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern int sqlite3_close(IntPtr db);
    
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern IntPtr sqlite3_errmsg(IntPtr db);

    const int SQLITE_OPEN_READWRITE = 2;
    const int SQLITE_OPEN_CREATE = 4;
    const int SQLITE_OPEN_FULLMUTEX = 0x00010000;
    
    public static int Main(string[] args)
    {
        string path = @"C:\Users\wzyyxx\.codex\state_5.sqlite";
        
        // Try with FULLMUTEX
        IntPtr db;
        int rc = sqlite3_open_v2(path, out db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, null);
        Console.WriteLine("Open with FULLMUTEX: rc=" + rc);
        if (rc != 0) {
            IntPtr err = sqlite3_errmsg(db);
            Console.WriteLine("  Error: " + Marshal.PtrToStringAnsi(err));
            return 1;
        }
        
        // Try each pragma separately to see which fails
        string[] pragmas = new string[] {
            "PRAGMA journal_size_limit = 65536",
            "PRAGMA wal_autocheckpoint = 500",
            "PRAGMA wal_checkpoint(TRUNCATE)",
            "PRAGMA wal_checkpoint(PASSIVE)",
            "PRAGMA wal_checkpoint(FULL)",
            "PRAGMA journal_mode = DELETE",
            "PRAGMA journal_mode = WAL"
        };
        
        foreach (string sql in pragmas) {
            IntPtr err;
            rc = sqlite3_exec(db, sql, IntPtr.Zero, IntPtr.Zero, out err);
            if (rc != 0) {
                IntPtr errPtr = sqlite3_errmsg(db);
                string errStr = Marshal.PtrToStringAnsi(errPtr);
                Console.WriteLine("  FAIL: " + sql + " -> " + errStr);
            } else {
                Console.WriteLine("  OK: " + sql);
            }
        }
        
        // Try checking actual file ACL
        var info = new System.IO.FileInfo(path);
        var acl = info.GetAccessControl();
        Console.WriteLine("ACL owner: " + acl.GetOwner(typeof(System.Security.Principal.NTAccount)));
        foreach (var rule in acl.GetAccessRules(true, true, typeof(System.Security.Principal.NTAccount))) {
            var fr = (System.Security.AccessControl.FileSystemAccessRule)rule;
            Console.WriteLine("  " + fr.IdentityReference + ": " + fr.FileSystemRights + " (" + fr.AccessControlType + ")");
        }
        
        sqlite3_close(db);
        return 0;
    }
}
